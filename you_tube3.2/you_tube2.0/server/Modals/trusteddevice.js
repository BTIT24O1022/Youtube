import mongoose from "mongoose";
const schema = mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    // A random token generated on first OTP verification and stored in the
    // browser's localStorage. It's what lets us recognize "this same
    // browser" on a later visit -- not just the IP, which can legitimately
    // change (mobile networks, VPNs) without it being a different device.
    deviceToken: { type: String, required: true, index: true },
    browser: { type: String, default: "" },
    ip: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    country: { type: String, default: "" },
    trustedUntil: { type: Date, required: true },
  },
  { timestamps: true }
);
export default mongoose.model("trusteddevice", schema);
