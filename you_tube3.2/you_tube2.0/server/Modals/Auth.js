import mongoose from "mongoose";
const userschema = mongoose.Schema({
  email: { type: String, required: true },
  name: { type: String },
  channelname: { type: String },
  description: { type: String },
  image: { type: String },
  role: { type: String, enum: ["user", "admin"], default: "user" },
  blocked: { type: Boolean, default: false },
  plan: { type: String, enum: ["Free", "Bronze", "Silver", "Gold"], default: "Free" },
  planExpiry: { type: Date, default: null },
  planBillingCycle: { type: String, enum: ["monthly", "quarterly", "yearly", null], default: null },
  // "auto" means: pick light/dark based on login time (5am-12pm IST = light,
  // else dark). Once the user manually toggles the theme, this switches to
  // "manual" and their explicit choice in `theme` is respected everywhere,
  // on every device, instead of just in this browser's localStorage.
  themeMode: { type: String, enum: ["auto", "manual"], default: "auto" },
  theme: { type: String, enum: ["light", "dark"], default: "dark" },
  joinedon: { type: Date, default: Date.now },
});

export default mongoose.model("user", userschema);
