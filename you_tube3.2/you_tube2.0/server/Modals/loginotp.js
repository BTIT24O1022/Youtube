import mongoose from "mongoose";
const schema = mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    loginRecordId: { type: mongoose.Schema.Types.ObjectId, ref: "loginrecord" },
    codeHash: { type: String, required: true },
    deviceToken: { type: String, default: "" },
    attempts: { type: Number, default: 0 },
    consumed: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);
export default mongoose.model("loginotp", schema);
