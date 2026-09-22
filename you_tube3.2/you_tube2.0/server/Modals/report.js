import mongoose from "mongoose";
const schema = mongoose.Schema(
  {
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    // Exactly one of these two is set, depending on what's being reported.
    videoid: { type: mongoose.Schema.Types.ObjectId, ref: "videofiles" },
    commentid: { type: mongoose.Schema.Types.ObjectId, ref: "comment" },
    reason: {
      type: String,
      enum: ["Spam", "Misleading content", "Harassment", "Copyright", "Violent content", "Other"],
      required: true,
    },
    status: { type: String, enum: ["pending", "reviewed", "dismissed"], default: "pending" },
  },
  { timestamps: true }
);
export default mongoose.model("report", schema);
