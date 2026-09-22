import mongoose from "mongoose";
const schema = mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    name: { type: String, required: true },
    videos: [{ type: mongoose.Schema.Types.ObjectId, ref: "videofiles" }],
    isPublic: { type: Boolean, default: false },
  },
  { timestamps: true }
);
export default mongoose.model("playlist", schema);
