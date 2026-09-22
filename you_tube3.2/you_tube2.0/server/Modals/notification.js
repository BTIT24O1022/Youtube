import mongoose from "mongoose";
const schema = mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
    type: {
      type: String,
      enum: ["subscribe", "like", "comment", "reply", "new_video"],
      required: true,
    },
    videoid: { type: mongoose.Schema.Types.ObjectId, ref: "videofiles" },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);
export default mongoose.model("notification", schema);
