import mongoose from "mongoose";
const schema = mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
    plan: { type: String, enum: ["Bronze", "Silver", "Gold"], required: true },
    billingCycle: { type: String, enum: ["monthly", "quarterly", "yearly"], required: true },
    amount: { type: Number, required: true }, // paise
    currency: { type: String, default: "INR" },
    razorpayOrderId: { type: String, required: true },
    razorpayPaymentId: { type: String, default: null },
    invoiceNumber: { type: String, default: null },
    status: { type: String, enum: ["created", "paid", "failed", "cancelled"], default: "created" },
    subscriptionStart: { type: Date, default: null },
    subscriptionExpiry: { type: Date, default: null },
  },
  { timestamps: true }
);
export default mongoose.model("transaction", schema);
