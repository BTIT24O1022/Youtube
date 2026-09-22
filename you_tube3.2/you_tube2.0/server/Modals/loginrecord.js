import mongoose from "mongoose";
const schema = mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    ip: { type: String },
    browser: { type: String },
    browserVersion: { type: String },
    os: { type: String },
    deviceType: { type: String, enum: ["Desktop", "Mobile", "Tablet"], default: "Desktop" },
    deviceModel: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    country: { type: String, default: "" },
    status: { type: String, enum: ["trusted", "otp_pending", "otp_verified", "otp_failed", "logged_in"], required: true },
  },
  { timestamps: true }
);
export default mongoose.model("loginrecord", schema);
