import mongoose from "mongoose";
const schema = mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    video: { type: mongoose.Schema.Types.ObjectId, ref: "videofiles", required: true },
    plan: { type: String, required: true }, // plan the user was on at download time
    ip: { type: String, default: "" },
    browser: { type: String, default: "" },
    deviceType: { type: String, default: "" },
    fileSize: { type: Number, default: 0 },
    status: { type: String, enum: ["completed", "failed"], default: "completed" },
  },
  { timestamps: true }
);
export default mongoose.model("download", schema);
