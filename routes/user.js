import express from "express";
import { encrypt } from "../utils.js";
import User from "../models/User.js";
import Friend_Request from "../models/Friend_Request.js";
import multer from "multer";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { GridFsStorage } from "multer-gridfs-storage";
import { cacheUsers, client } from "../middlewares/cache.js";
import { deletePosts } from "../middlewares/background_worker.js";
import { verifyToken } from "../middlewares/auth.js";

dotenv.config();

const router = express.Router();

let gfs;

const conn = mongoose.createConnection(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

conn.once("open", () => {
  gfs = new mongoose.mongo.GridFSBucket(conn.db, {
    bucketName: "user-image",
  });
});

const storage = new GridFsStorage({
  url: process.env.MONGO_URL,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      try {
        const filename = file.originalname;
        const fileInfo = {
          filename: filename,
          bucketName: "user-image",
        };
        resolve(fileInfo);
      } catch (error) {
        reject("file not found!!");
      }
    });
  },
});

const upload = multer({ storage });

router.put("/update/user/:id", async (req, res) => {
  if (req.body.id === req.params.id || req.body.isAdmin) {
    if (req.body.password) {
      try {
        req.body.password = await encrypt(req.body.password);
      } catch (error) {
        return res.status(500).json(error);
      }
    }
    try {
      await User.findByIdAndUpdate(req.params.id, {
        $set: req.body,
      });
      res.status(200).json({ message: "details updated" });
    } catch (error) {
      res.status(500).json({ message: error });
    }
  } else {
    return res.status(403).json({ message: "permission denied!" });
  }
});

router.put("/update/cover/:uid", upload.single("file"), async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.uid, {
      $set: { coverPic: req.file.filename, coverPicId: req.file.id },
    });
    res.status(200).json({ message: "cover image updated" });
  } catch (err) {
    res.status(500).json({ message: err });
  }
});

router.put(
  "/update/profilePic/:uid",
  upload.single("file"),
  async (req, res) => {
    try {
      if (req.file)
        await User.findByIdAndUpdate(req.params.uid, {
          $set: { profilePic: req.file.filename, profilePicId: req.file.id },
        });
      res.status(200).json("profile pic updated");
    } catch (err) {
      res.status(500).json({ message: err });
    }
  }
);

router.get("/get/cover", async (req, res) => {
  try {
    const file = await gfs
      .find({
        filename: req.query.filename,
      })
      .toArray((err, files) => {
        if (!files || files.length == 0) {
          return res.status(404).json("file not found");
        }
        res.setHeader("Cache-Control", "public,max-age=172800");
        return gfs.openDownloadStreamByName(req.query.filename).pipe(res);
      });
  } catch (error) {
    res.status(500).json(error);
  }
});

router.get("/get/profilePic", async (req, res) => {
  try {
    const file = await gfs.find({
      filename: req.query.filename,
    });
    await file.toArray((err, files) => {
      if (!files || files.length == 0) {
        return res.status(404).json("file not found");
      }
      res.setHeader("Cache-Control", "public,max-age=172800");
      return gfs.openDownloadStreamByName(req.query.filename).pipe(res);
    });
  } catch (error) {
    res.status(500).json(error);
  }
});

router.put(
  "update/user/profile/:id",
  upload.single("file"),
  async (req, res) => {
    try {
      await User.findByIdAndUpdate(req.params.id, {
        $set: { profilePic: req.file.filename },
      });
      res.status(200).json("cover image updated");
    } catch (err) {
      res.status(500).json(err);
    }
  }
);

router.delete("/delete/user/:id", verifyToken, async (req, res) => {
  if (req.body.id !== req.params.id) {
    return res.status(403).json({ message: "permission denied!" });
  }
  try {
    const user = await User.findById(req.params.id);
    const { _id } = user;
    // delete all users posts
    deletePosts(_id);
    const all_users = await User.find();
    const profilePicId = user.profilePicId || "";
    const coverPicId = user.coverPicId || "";
    if (profilePicId != "") {
      await gfs.delete(new mongoose.Types.ObjectId(profilePicId));
    }
    if (coverPicId != "") {
      await gfs.delete(new mongoose.Types.ObjectId(coverPicId));
    }
    all_users.map(async (u) => {
      if (u.friends.includes(req.params.id)) {
        await u.updateOne({ $pull: { friends: req.params.id } });
      }
    });
    await user.deleteOne();
    res.status(200).json("Account Deleted.");
  } catch (error) {
    res.status(400).json(error);
  }
});

router.get("/get/users", cacheUsers, async (req, res) => {
  try {
    const user = await User.find();
    let res_ = [];
    user.map((u) => {
      const { password, ...rest } = u._doc;
      res_.push(rest);
    });
    await client.setEx("all_users", 172800, JSON.stringify(res_));
    res.status(200).json(res_);
  } catch (error) {
    res.status(500).json(error);
  }
});

router.get("/get/user/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    const { password, ...rest } = await user._doc;
    res.status(200).json(rest);
  } catch (error) {
    res.status(500).json({ message: "User not Found!" });
  }
});

router.get("/search/user/:uname", async (req, res) => {
  try {
    const users = await User.find({
      fname: req.params.uname,
    }).collation({ locale: "en", strength: 2 });
    const list = [];
    users.map((u) => {
      const { _id, fname, lname, profilePic, ...rest } = u;
      list.push({ _id, fname, lname, profilePic });
    });
    res.status(200).json(list);
  } catch (error) {
    res.status(500).json(error);
  }
});

router.get("/friends/:uid", async (req, res) => {
  try {
    const user = await User.findById(req.params.uid);
    const friends = await Promise.all(
      user.friends.map((id) => {
        return User.findById(id);
      })
    );
    let friendsList = [];
    friends.map((friend) => {
      const { _id, fname, lname, profilePic } = friend;
      friendsList.push({ _id, fname, lname, profilePic });
    });
    res.status(200).json(friendsList);
  } catch (error) {
    res.status(500).json(error);
  }
});

router.post("/make/req", async (req, res) => {
  try {
    const res_ = new Friend_Request(req.body.props);
    await res_.save();
    res.status(200).json("OK");
  } catch (err) {
    res.status(500).json(err);
  }
});

router.post("/check/req_status", async (req, res) => {
  try {
    const res_ = await Friend_Request.findOne({
      receiverId: req.body.receiverId,
      senderId: req.body.senderId,
    });
    if (res_ && res_.status === "PENDING") {
      return res.status(200).json("PENDING");
    }
    return res.status(200).json("OK");
  } catch (err) {
    res.status(500).json(err);
  }
});

router.post("/check/req", async (req, res) => {
  try {
    const res_ = await Friend_Request.find({
      receiverId: req.body.receiverId,
    });

    res.status(200).json(res_);
  } catch (err) {
    res.status(500).json(err);
  }
});

router.delete("/withdraw/req", async (req, res) => {
  try {
    await Friend_Request.findOneAndDelete({
      senderId: req.body.senderId,
      receiverId: req.body.receiverId,
    });
    res.status(200).json("OK");
  } catch (err) {
    res.status(500).json(err);
  }
});

router.post("/accept/req", async (req, res) => {
  try {
    const user = await Friend_Request.findOne({
      senderId: req.body.senderId,
      receiverId: req.body.receiverId,
    });
    if (req.body.status == "ACCEPT") {
      try {
        const sender = await User.findById(req.body.senderId);
        const receiver = await User.findById(req.body.receiverId);
        await receiver.updateOne({ $push: { friends: req.body.senderId } });
        await sender.updateOne({ $push: { friends: req.body.receiverId } });
        await user.deleteOne();
        return res.status(200).json({ message: "Request Accepted!" });
      } catch (error) {
        console.log(error);
        return res
          .status(400)
          .json({ message: "error while accepting request!" });
      }
    }
    await user.deleteOne();
    res.status(200).json({ message: "OK" });
  } catch (err) {
    res.status(500).json({ message: "Missing Payload!!" });
  }
});

router.put("/unfriend", async (req, res) => {
  try {
    const sender = await User.findById(req.body.senderId);
    const receiver = await User.findById(req.body.receiverId);
    await receiver.updateOne({ $pull: { friends: req.body.senderId } });
    await sender.updateOne({ $pull: { friends: req.body.receiverId } });

    res.status(200).json("OK");
  } catch (err) {
    res.status(500).json(err);
  }
});

export default router;
