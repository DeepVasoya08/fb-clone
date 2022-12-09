import mongoose from "mongoose";

const StorySchema = new mongoose.Schema({
  userId: {
    type: String,
    require: true,
  },
  fname: String,
  lname: String,
  profilePic: String,
  image: String,
  imageID: String,
  createdAt: { type: Date, expires: 86400, default: Date.now() },
});

export default mongoose.model("Story", StorySchema);
