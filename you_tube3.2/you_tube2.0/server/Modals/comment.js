import mongoose from "mongoose";
const commentschema = mongoose.Schema(
  {
    userid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    videoid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "videofiles",
      required: true,
    },
    commentbody: { type: String },
    usercommented: { type: String },
    userimage: { type: String, default: "" },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: "comment", default: null },
    flagged: { type: Boolean, default: false },
    edited: { type: Boolean, default: false },
    Like: { type: Number, default: 0 },
    Dislike: { type: Number, default: 0 },
    // Approximate, from a free IP-geolocation lookup at post time. Best-effort
    // only -- never blocks the comment if the lookup fails or times out.
    location: { type: String, default: "" },
    commentedon: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("comment", commentschema);
