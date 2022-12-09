import mongoose from "mongoose";

const ImageSchema = new mongoose.Schema(
  {
    name: String,
    desc: String,
    image: {
      type: Buffer,
      contentType: string,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Image", ImageSchema);
