import express from "express";
import Post from "../models/Post.js";
import User from "../models/User.js";
import multer from "multer";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { GridFsStorage } from "multer-gridfs-storage";
import { cachePosts, client } from "../middlewares/cache.js";

dotenv.config();

const router = express.Router();
const url = process.env.MONGO_URL;

export let gfs;

const conn = mongoose.createConnection(url, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

conn.once("open", () => {
  gfs = new mongoose.mongo.GridFSBucket(conn.db, {
    bucketName: "post-images",
  });
});

const storage = new GridFsStorage({
  url: url,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      const filename = file.originalname;
      const fileInfo = {
        filename: filename,
        bucketName: "post-images",
      };
      resolve(fileInfo);
      reject("server error!!");
    });
  },
});

const upload = multer({ storage });

router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    return res.status(201).json(req.file.id);
  } catch (error) {
    res.send(500).json(error);
  }
});

router.get("/get/image", async (req, res) => {
  try {
    const file = await gfs
      .find({
        filename: req.query.filename,
      })
      .toArray((err, files) => {
        if (!files || files.length == 0) {
          return res.status(404).json("file not exist");
        }
        res.setHeader("Cache-Control", "public,max-age=172800");
        return gfs.openDownloadStreamByName(req.query.filename).pipe(res);
      });
  } catch (error) {
    res.status(500).json(error);
  }
});

router.post("/create", async (req, res) => {
  const post = new Post(req.body);
  try {
    const res_ = await post.save();
    res.status(200).json(res_);
  } catch (error) {
    res.status(500).json(error);
  }
});

router.put("/update/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (post.userId === req.body.userId) {
      await post.updateOne({ $set: req.body });
      res.status(200).json("post updated.");
    } else {
      res.status(403).json("permission denied!");
    }
  } catch (error) {
    res.status(500).json(error);
  }
});

router.delete("/delete/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    const fileID = post.imageID;
    if (post.userId === req.body.userId) {
      if (fileID) {
        await gfs.delete(new mongoose.Types.ObjectId(fileID), (err, data) => {
          if (err) {
            return res.json(err);
          }
        });
      }
      await post.deleteOne();
      res.status(200);
    } else {
      res.status(403).json("permission denied!");
    }
  } catch (error) {
    res.status(400).json(error);
  }
});

router.put("/like/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post.likes.includes(req.body.userId)) {
      await post.updateOne({ $push: { likes: req.body.userId } });
      res.status(200).json("liked");
    } else {
      await post.updateOne({ $pull: { likes: req.body.userId } });
      res.status(200).json("disliked");
    }
  } catch (error) {
    res.status(500).json(error);
  }
});

router.get("/get/comments/:pid", async (req, res) => {
  try {
    const post = await Post.findById(req.params.pid);
    res.status(200).json(post);
  } catch (error) {
    res.status(500).json(error);
  }
});

router.put("/post/comment/:pid", async (req, res) => {
  try {
    const post = await Post.findById(req.params.pid);
    await post.updateOne({ $push: { comments: req.body } });
    res.status(200).json("commented on post");
  } catch (error) {
    res.status(500).json(error);
  }
});

router.get("/get/all-posts", cachePosts, async (req, res) => {
  try {
    const post = await Post.find();
    await client.setEx("all_posts", 172800, JSON.stringify(post));
    res.status(200).json(post);
  } catch (err) {
    res.status(404).json(err);
  }
});

router.get("/get/:uid", async (req, res) => {
  try {
    const post = await Post.find({ userId: req.params.uid });
    res.status(200).json(post);
  } catch (error) {
    res.status(400).json("Oops! post not found.");
  }
});

router.get("/get/timeline/:uid", async (req, res) => {
  try {
    const curUser = await User.findById(req.params.uid);
    const userPost = await Post.find({ userId: curUser._id });
    const friendPost = await Promise.all(
      curUser.followings.map((id) => {
        Post.find({ userId: id });
      })
    );
    res.json(userPost.concat(...friendPost));
  } catch (error) {
    res.status(500).json(error);
  }
});

export default router;
