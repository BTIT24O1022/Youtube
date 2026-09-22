import path from "path";
import fs from "fs";
import mongoose from "mongoose";
import { UAParser } from "ua-parser-js";
import users from "../Modals/Auth.js";
import video from "../Modals/video.js";
import download from "../Modals/download.js";
import { PLANS } from "../filehelper/plans.js";
import { downgradeIfExpired } from "./billing.js";

// "Today" boundary is UTC midnight -- simple and predictable.
const startOfTodayUTC = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};

const resolveLocalVideoPath = (filepath) => {
  if (!filepath) return null;
  const normalized = filepath.replace(/\\/g, "/");
  const directPath = path.resolve(normalized);
  if (fs.existsSync(directPath)) return directPath;

  const filename = path.basename(normalized);
  const localUploadsPath = path.resolve(path.join("uploads", filename));
  if (fs.existsSync(localUploadsPath)) return localUploadsPath;

  return null;
};

export const getquota = async (req, res) => {
  try {
    let user = await users.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    user = await downgradeIfExpired(user);
    const planName = user.plan && PLANS[user.plan] ? user.plan : "Free";
    const limit = PLANS[planName].downloadLimit;
    const usedToday = await download.countDocuments({
      user: req.userId,
      status: "completed",
      createdAt: { $gte: startOfTodayUTC() },
    });
    return res.status(200).json({ plan: planName, limit, usedToday, remaining: Math.max(0, limit - usedToday) });
  } catch (error) {
    console.error("Quota error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const requestdownload = async (req, res) => {
  try {
    const { videoId } = req.params;
    if (!videoId || videoId === "undefined" || !mongoose.Types.ObjectId.isValid(videoId)) {
      return res.status(400).json({ message: "Invalid video ID" });
    }
    const vid = await video.findById(videoId);
    if (!vid) return res.status(404).json({ message: "Video not found" });
    if (vid.visibility === "private") return res.status(403).json({ message: "This video isn't available for download" });

    const localPath = resolveLocalVideoPath(vid.filepath);
    if (!localPath) {
      return res.status(404).json({
        message: "This video's media file was uploaded on a different machine and is not present on the current server's storage disk.",
      });
    }

    let user = await users.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    user = await downgradeIfExpired(user);
    const planName = user.plan && PLANS[user.plan] ? user.plan : "Free";
    const limit = PLANS[planName].downloadLimit;

    // Re-downloading the SAME video again today doesn't count a second
    // time against the daily quota -- matches "preventing duplicate
    // downloads from counting multiple times within a defined period."
    const alreadyToday = await download.findOne({
      user: req.userId,
      video: videoId,
      status: "completed",
      createdAt: { $gte: startOfTodayUTC() },
    });

    if (!alreadyToday) {
      const usedToday = await download.countDocuments({
        user: req.userId,
        status: "completed",
        createdAt: { $gte: startOfTodayUTC() },
      });
      if (usedToday >= limit) {
        return res.status(429).json({
          message: `You've reached your daily download limit (${limit}) on the ${planName} plan.`,
          limit,
          usedToday,
        });
      }
    }

    const parser = new UAParser(req.headers["user-agent"] || "");
    const result = parser.getResult();
    const ip = (req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress || "").trim();

    await download.create({
      user: req.userId,
      video: videoId,
      plan: planName,
      ip,
      browser: `${result.browser.name || "Unknown"} on ${result.os.name || "Unknown"}`,
      deviceType: result.device.type === "mobile" ? "Mobile" : result.device.type === "tablet" ? "Tablet" : "Desktop",
      fileSize: vid.filesize || 0,
    });

    const cleanPath = (vid.filepath || "").replace(/\\/g, "/");
    return res.status(200).json({
      downloadUrl: cleanPath.startsWith("/") ? cleanPath : `/${cleanPath}`,
      filename: vid.filename || `${vid.videotitle || "video"}.mp4`,
    });
  } catch (error) {
    console.error("Request download error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const filedownload = async (req, res) => {
  try {
    const { videoId } = req.params;
    if (!videoId || videoId === "undefined" || !mongoose.Types.ObjectId.isValid(videoId)) {
      return res.status(400).json({ message: "Invalid video ID" });
    }
    const vid = await video.findById(videoId);
    if (!vid) return res.status(404).json({ message: "Video not found" });
    const localPath = resolveLocalVideoPath(vid.filepath);
    if (!localPath) {
      return res.status(404).json({
        message: "This video file was uploaded on a different machine and is not present on the current server's storage disk.",
      });
    }
    return res.download(localPath, vid.filename || `${vid.videotitle || "video"}.mp4`);
  } catch (error) {
    console.error("File download error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getmydownloads = async (req, res) => {
  try {
    const downloads = await download.find({ user: req.userId }).populate("video").sort({ createdAt: -1 });
    return res.status(200).json(downloads);
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong" });
  }
};
