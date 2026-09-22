import crypto from "crypto";
import Razorpay from "razorpay";
import users from "../Modals/Auth.js";
import transaction from "../Modals/transaction.js";
import { PLANS, BILLING_DAYS } from "../filehelper/plans.js";
import { sendInvoiceEmail } from "../filehelper/mailer.js";

// Razorpay client is only constructed when actually needed (not at module
// load), so the rest of the server still boots fine if you haven't added
// test keys yet -- only the payment endpoints themselves will error.
const getRazorpay = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error("RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET not set on the server");
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

export const getplans = (req, res) => {
  return res.status(200).json(PLANS);
};

// If a user's paid plan has expired, drop them back to Free. This runs
// lazily whenever we fetch their subscription status, instead of needing a
// separate scheduled cron job -- simpler, and just as correct for a project
// this size. Nothing about their videos/history/watchlater is touched.
export const downgradeIfExpired = async (user) => {
  if (user.plan !== "Free" && user.planExpiry && new Date() > user.planExpiry) {
    user.plan = "Free";
    user.planExpiry = null;
    user.planBillingCycle = null;
    await user.save();
  }
  return user;
};

export const getmysubscription = async (req, res) => {
  try {
    let user = await users.findById(req.userId);
    user = await downgradeIfExpired(user);
    const daysRemaining = user.planExpiry
      ? Math.max(0, Math.ceil((user.planExpiry.getTime() - Date.now()) / 86400000))
      : null;
    return res.status(200).json({
      plan: user.plan,
      billingCycle: user.planBillingCycle,
      expiry: user.planExpiry,
      daysRemaining,
    });
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getbillinghistory = async (req, res) => {
  try {
    const history = await transaction.find({ user: req.userId }).sort({ createdAt: -1 });
    return res.status(200).json(history);
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// Step 1 of the payment flow: create a Razorpay order and a matching
// "created" transaction record. The frontend uses the order to open the
// Razorpay checkout widget -- no money has moved yet.
export const createorder = async (req, res) => {
  try {
    const { plan, billingCycle } = req.body;
    if (!PLANS[plan] || plan === "Free") {
      return res.status(400).json({ message: "Invalid plan" });
    }
    if (!BILLING_DAYS[billingCycle]) {
      return res.status(400).json({ message: "Invalid billing cycle" });
    }
    const amount = PLANS[plan].prices[billingCycle];
    const razorpay = getRazorpay();

    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: `rcpt_${req.userId}_${Date.now()}`,
    });

    await transaction.create({
      user: req.userId,
      plan,
      billingCycle,
      amount,
      razorpayOrderId: order.id,
      status: "created",
    });

    return res.status(200).json({
      orderId: order.id,
      amount,
      currency: "INR",
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: error.message || "Couldn't create order" });
  }
};

// Step 2: after the Razorpay checkout widget completes, the frontend sends
// us back what it received. We NEVER trust that at face value -- we
// recompute the expected signature ourselves using our secret key and
// compare. Only if they match do we know the payment is genuine and
// wasn't tampered with in transit.
export const verifypayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      await transaction.findOneAndUpdate({ razorpayOrderId: razorpay_order_id }, { status: "failed" });
      return res.status(400).json({ message: "Payment verification failed" });
    }

    const txn = await transaction.findOne({ razorpayOrderId: razorpay_order_id });
    if (!txn) return res.status(404).json({ message: "Order not found" });

    // Idempotency: if this transaction was already marked paid (e.g. the
    // verify request was retried after a network blip), don't apply the
    // subscription extension twice.
    if (txn.status === "paid") {
      return res.status(200).json({ message: "Already verified", plan: txn.plan });
    }

    const now = new Date();
    const days = BILLING_DAYS[txn.billingCycle];
    const buyer = await users.findById(req.userId);
    // If they're renewing the SAME plan while time still remains on it,
    // extend from the current expiry instead of from right now -- otherwise
    // renewing a day early would throw away whatever time was left.
    // Switching to a DIFFERENT plan always starts fresh from today, since
    // "upgrade to Gold" shouldn't inherit Silver's remaining days.
    const stackFrom =
      buyer.plan === txn.plan && buyer.planExpiry && buyer.planExpiry > now ? buyer.planExpiry : now;
    const expiry = new Date(stackFrom.getTime() + days * 86400000);
    const invoiceNumber = `INV-${Date.now()}-${txn._id.toString().slice(-6).toUpperCase()}`;

    txn.status = "paid";
    txn.razorpayPaymentId = razorpay_payment_id;
    txn.invoiceNumber = invoiceNumber;
    txn.subscriptionStart = now;
    txn.subscriptionExpiry = expiry;
    await txn.save();

    await users.findByIdAndUpdate(req.userId, {
      plan: txn.plan,
      planExpiry: expiry,
      planBillingCycle: txn.billingCycle,
    });

    // Email is best-effort -- a subscriber's plan is already active at this
    // point regardless of whether the confirmation email succeeds, so we
    // never let a mail failure look like the payment itself failed.
    try {
      const buyer = await users.findById(req.userId);
      await sendInvoiceEmail(buyer.email, {
        plan: txn.plan,
        billingCycle: txn.billingCycle,
        amount: txn.amount,
        invoiceNumber,
        paymentId: razorpay_payment_id,
        expiry,
      });
    } catch (mailError) {
      console.warn("Invoice email not sent (SMTP not configured or failed):", mailError.message);
    }

    return res.status(200).json({ message: "Payment verified", plan: txn.plan, expiry, invoiceNumber });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong verifying payment" });
  }
};

// Records that the checkout was closed/cancelled before completing --
// useful for the billing history, distinct from an actual failed payment.
export const cancelorder = async (req, res) => {
  try {
    await transaction.findOneAndUpdate(
      { razorpayOrderId: req.body.razorpayOrderId, status: "created" },
      { status: "cancelled" }
    );
    return res.status(200).json({ cancelled: true });
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// Cancelling an active subscription drops the user to Free immediately.
// Their videos, history, likes, etc. are completely untouched.
export const cancelsubscription = async (req, res) => {
  try {
    await users.findByIdAndUpdate(req.userId, { plan: "Free", planExpiry: null, planBillingCycle: null });
    return res.status(200).json({ cancelled: true });
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong" });
  }
};
