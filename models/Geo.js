import mongoose from "mongoose";

const GeoSchema = new mongoose.Schema(
  {
    ip: String,
    latitude: String,
    longitude: String,
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Geo", GeoSchema);
