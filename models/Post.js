import mongoose from "mongoose";

const PostSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      require: true,
    },
    fname: String,
    lname: String,
    profilePic: String,
    desc: String,
    image: String,
    imageID: String,
    comments: {
      uid: String,
      fname: String,
      lname: String,
      message: String,
    },
    likes: {
      type: Array,
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Posts", PostSchema);
