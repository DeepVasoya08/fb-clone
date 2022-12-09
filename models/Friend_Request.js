import mongoose from "mongoose";

const RequestsSchema = new mongoose.Schema({
  senderId: {
    type: String,
    required: true,
  },
  receiverId: {
    type: String,
    required: true,
  },
  sender_fname: String,
  sender_lname: String,
  profilePic: String,
  status: {
    type: String,
    default: "PENDING",
  },
  createdAt: { type: Date, expires: 86400, default: Date.now() },
});

export default mongoose.model("Requests", RequestsSchema);
