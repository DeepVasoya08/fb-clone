import express from "express";
import mongoose from "mongoose";
import multer from "multer";
import dotenv from "dotenv";
import { GridFsStorage } from "multer-gridfs-storage";

import Story from "../models/Story.js";
import { cacheStories, client } from "../middlewares/cache.js";

dotenv.config();

const router = express.Router();

let gfs;

const conn = mongoose.createConnection(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

conn.once("open", () => {
  gfs = new mongoose.mongo.GridFSBucket(conn.db, {
    bucketName: "stories",
  });
});

const storage = new GridFsStorage({
  url: process.env.MONGO_URL,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      const filename = file.originalname;
      const fileInfo = {
        filename: filename,
        bucketName: "stories",
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
        return gfs.openDownloadStreamByName(req.query.filename).pipe(res);
      });
  } catch (error) {
    res.status(500).json(error);
  }
});

router.post("/create", async (req, res) => {
  const story = new Story(req.body);
  try {
    const res_ = await story.save();
    res.status(200).json(res_);
  } catch (error) {
    res.status(500).json(error);
  }
});

router.get("/get/stories", cacheStories, async (req, res) => {
  try {
    const story = await Story.find();
    await client.setEx("all_stories", 172800, JSON.stringify(story));
    res.status(200).json(story);
  } catch (err) {
    res.status(404).json(err);
  }
});

export default router;
