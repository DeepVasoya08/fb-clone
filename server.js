import express from "express";
import mongoose from "mongoose";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import cors from "cors";
import Pusher from "pusher";

import user from "./routes/user.js";
import posts from "./routes/posts.js";
import story from "./routes/story.js";
import auth from "./routes/auth.js";
import { deleteCache } from "./middlewares/cache.js";

dotenv.config();

const pusher = new Pusher({
  appId: "1231080",
  key: "657da354cfe34ab989da",
  secret: "34da9cb8dbd981cfed84",
  cluster: "ap2",
  useTLS: true,
});

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(morgan("common"));

const port = process.env.PORT || 9000;

mongoose
  .connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("connected to mongo");
  })
  .catch((e) => {
    console.error("network error");
  });

mongoose.connection.once("open", () => {
  const postStream = mongoose.connection.collection("posts").watch();
  const userStream = mongoose.connection.collection("users").watch();
  const storyStream = mongoose.connection.collection("stories").watch();
  const requests = mongoose.connection.collection("requests").watch();

  postStream.on("change", (change) => {
    if (
      change.operationType == "insert" ||
      change.operationType == "modify" ||
      change.operationType == "update" ||
      change.operationType == "delete"
    ) {
      pusher.trigger("posts", "post", { change: "post modified" });
      deleteCache("all_posts");
    }
  });

  userStream.on("change", (change) => {
    if (
      change.operationType == "insert" ||
      change.operationType == "modify" ||
      change.operationType == "update" ||
      change.operationType == "delete"
    ) {
      pusher.trigger("users", "user", { change: "user modified" });
      deleteCache("all_users");
    }
  });

  storyStream.on("change", (change) => {
    if (
      change.operationType == "insert" ||
      change.operationType == "modify" ||
      change.operationType == "update" ||
      change.operationType == "delete"
    ) {
      pusher.trigger("stories", "story", { change: "story modified" });
      deleteCache("all_stories");
    }
  });

  requests.on("change", (change) => {
    if (
      change.operationType == "insert" ||
      change.operationType == "modify" ||
      change.operationType == "update" ||
      change.operationType == "delete"
    ) {
      pusher.trigger("requests", "request", {
        change: "friend requests modified",
      });
    }
  });
});

app.get("/", (req, res) => {
  res.status(200).json("server is up");
});

app.use("/api/user", user);
app.use("/api/posts", posts);
app.use("/api/story", story);
app.use("/api/auth", auth);

app.listen(port, () => {
  console.log(`server running on ${port}`);
});
