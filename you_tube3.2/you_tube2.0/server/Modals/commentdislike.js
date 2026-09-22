import mongoose from "mongoose";
const schema = mongoose.Schema(
  {
    viewer: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    commentid: { type: mongoose.Schema.Types.ObjectId, ref: "comment", required: true },
  },
  { timestamps: true }
);
schema.index({ viewer: 1, commentid: 1 }, { unique: true });
export default mongoose.model("commentdislike", schema);
