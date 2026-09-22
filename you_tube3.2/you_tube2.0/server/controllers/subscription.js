import mongoose from "mongoose";
import subscription from "../Modals/subscription.js";
import users from "../Modals/Auth.js";
import { createNotification } from "../filehelper/notify.js";

// Helper to resolve channel ID whether passed as ObjectId or channel name
const resolveChannelId = async (idOrName) => {
  if (!idOrName || idOrName === "undefined" || idOrName === "null") return null;
  const trimmed = String(idOrName).trim();
  if (mongoose.Types.ObjectId.isValid(trimmed)) {
    const user = await users.findById(trimmed);
    if (user) return String(user._id);
  }
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const userByName = await users.findOne({
    $or: [
      { channelname: { $regex: new RegExp(`^${escaped}$`, "i") } },
      { name: { $regex: new RegExp(`^${escaped}$`, "i") } },
    ],
  });
  return userByName ? String(userByName._id) : null;
};

export const handlesubscribe = async (req, res) => {
  const subscriber = req.userId;
  const { channelId: rawChannelId } = req.params;
  const channelId = await resolveChannelId(rawChannelId);
  if (!channelId) {
    return res.status(400).json({ message: "Channel not found" });
  }
  if (String(subscriber) === String(channelId)) {
    return res.status(400).json({ message: "You can't subscribe to your own channel" });
  }
  try {
    const existing = await subscription.findOne({ subscriber, channel: channelId });
    let subscribed;
    if (existing) {
      await subscription.findByIdAndDelete(existing._id);
      subscribed = false;
    } else {
      await subscription.create({ subscriber, channel: channelId });
      subscribed = true;
      const channelUser = await users.findById(subscriber);
      await createNotification(req.app.get("io"), {
        recipient: channelId,
        sender: subscriber,
        type: "subscribe",
        message: `${channelUser?.channelname || channelUser?.name || "Someone"} subscribed to your channel`,
      });
    }
    const subscriberCount = await subscription.countDocuments({ channel: channelId });
    return res.status(200).json({ subscribed, subscriberCount, resolvedChannelId: channelId });
  } catch (error) {
    console.error("Handle subscribe error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// Public: anyone viewing a channel page should see its subscriber count
// and (if logged in) whether *they* are subscribed.
export const getsubscriptionstatus = async (req, res) => {
  const { channelId: rawChannelId } = req.params;
  try {
    const channelId = await resolveChannelId(rawChannelId);
    if (!channelId) {
      return res.status(200).json({ subscriberCount: 0, isSubscribed: false, resolvedChannelId: null });
    }
    const subscriberCount = await subscription.countDocuments({ channel: channelId });
    let isSubscribed = false;
    if (req.userId) {
      isSubscribed = !!(await subscription.findOne({ subscriber: req.userId, channel: channelId }));
    }
    return res.status(200).json({ subscriberCount, isSubscribed, resolvedChannelId: channelId });
  } catch (error) {
    console.error("Subscription status error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getmysubscriptions = async (req, res) => {
  const { userId } = req.params;
  if (String(userId) !== String(req.userId)) {
    return res.status(403).json({ message: "You can only view your own subscriptions" });
  }
  try {
    const subs = await subscription.find({ subscriber: userId }).populate("channel", "channelname name image");
    return res.status(200).json(subs);
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong" });
  }
};
