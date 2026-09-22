import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import video from "../Modals/video.js";
import subscription from "../Modals/subscription.js";
import like from "../Modals/like.js";
import dislike from "../Modals/dislike.js";
import watchlater from "../Modals/watchlater.js";
import history from "../Modals/history.js";
import users from "../Modals/Auth.js";
import { createNotification } from "../filehelper/notify.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ensureUploaderResolved = async (vidObj) => {
  if (!vidObj) return vidObj;
  const doc = vidObj.toObject ? vidObj.toObject() : { ...vidObj };
  const isValidMongoId =
    doc.uploader &&
    doc.uploader !== "undefined" &&
    doc.uploader !== "null" &&
    mongoose.Types.ObjectId.isValid(doc.uploader);
  if (!isValidMongoId) {
    if (doc.videochanel) {
      const escaped = String(doc.videochanel).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const channelUser = await users.findOne({
        $or: [
          { channelname: { $regex: new RegExp(`^${escaped}$`, "i") } },
          { name: { $regex: new RegExp(`^${escaped}$`, "i") } },
        ],
      });
      if (channelUser) {
        doc.uploader = String(channelUser._id);
      } else {
        doc.uploader = null;
      }
    } else {
      doc.uploader = null;
    }
  } else {
    doc.uploader = String(doc.uploader);
  }
  return doc;
};

export const uploadvideo = async (req, res) => {
  if (req.file === undefined) {
    return res.status(404).json({ message: "plz upload a mp4 video file only" });
  }
  try {
    let cleanPath = req.file.path.replace(/\\/g, "/");
    if (cleanPath.includes("uploads/")) {
      cleanPath = "uploads/" + cleanPath.substring(cleanPath.indexOf("uploads/") + 8);
    } else {
      cleanPath = `uploads/${path.basename(cleanPath)}`;
    }

    const uploaderId = req.body.uploader || req.userId;
    const file = new video({
      videotitle: req.body.videotitle,
      filename: req.file.originalname,
      filepath: cleanPath,
      filetype: req.file.mimetype,
      filesize: req.file.size,
      videochanel: req.body.videochanel,
      uploader: uploaderId,
      category: req.body.category,
      description: req.body.description || "",
      duration: Number(req.body.duration) || 0,
      tags: req.body.tags ? String(req.body.tags).split(",").map((t) => t.trim()).filter(Boolean) : [],
    });
    await file.save();

    // Tell every subscriber this channel just uploaded a new video.
    if (uploaderId) {
      const subs = await subscription.find({ channel: uploaderId });
      const io = req.app.get("io");
      for (const sub of subs) {
        await createNotification(io, {
          recipient: sub.subscriber,
          sender: uploaderId,
          type: "new_video",
          videoid: file._id,
          message: `${req.body.videochanel} uploaded a new video: ${req.body.videotitle}`,
        });
      }
    }

    return res.status(201).json("file uploaded successfully");
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getallvideo = async (req, res) => {
  try {
    const { category } = req.query;
    const filter = { visibility: { $ne: "private" } };
    if (category && category !== "All") filter.category = category;
    const files = await video.find(filter);
    const enriched = await Promise.all(files.map(ensureUploaderResolved));
    return res.status(200).send(enriched);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getvideobyid = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || id === "undefined" || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid video ID format" });
    }
    const found = await video.findById(id);
    if (!found) return res.status(404).json({ message: "Video not found" });
    const enriched = await ensureUploaderResolved(found);
    return res.status(200).json(enriched);
  } catch (error) {
    console.error("Error in getvideobyid:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// Advanced search: title, channel name, description, tags, category all
// searched together, plus optional filters for date/category/duration/views.
export const searchvideos = async (req, res) => {
  try {
    const { q = "", category, uploadDate, minViews, sort } = req.query;
    const filter = { visibility: "public" };

    if (q) {
      const regex = new RegExp(q, "i");
      filter.$or = [
        { videotitle: regex },
        { videochanel: regex },
        { description: regex },
        { tags: regex },
        { category: regex },
      ];
    }
    if (category && category !== "All") filter.category = category;
    if (minViews) filter.views = { $gte: Number(minViews) };
    if (uploadDate) {
      const days = { day: 1, week: 7, month: 30, year: 365 }[uploadDate] || null;
      if (days) filter.createdAt = { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) };
    }

    let query = video.find(filter);
    if (sort === "views") query = query.sort({ views: -1 });
    else if (sort === "date") query = query.sort({ createdAt: -1 });
    else if (sort === "likes") query = query.sort({ Like: -1 });

    const results = await query.exec();
    return res.status(200).json(results);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

const assertOwner = async (id, userId) => {
  if (!id || id === "undefined" || !mongoose.Types.ObjectId.isValid(id)) {
    return { error: 400, msg: "Invalid video ID format" };
  }
  const found = await video.findById(id);
  if (!found) return { error: 404, msg: "Video not found" };

  const enriched = await ensureUploaderResolved(found);
  const uploaderId = String(enriched.uploader || found.uploader || "");

  if (!userId || uploaderId !== String(userId)) {
    return { error: 403, msg: "You don't own this video" };
  }
  return { found };
};

export const updatevideo = async (req, res) => {
  const check = await assertOwner(req.params.id, req.userId);
  if (check.error) return res.status(check.error).json({ message: check.msg });
  const { videotitle, description, category, tags, visibility } = req.body;
  if (videotitle !== undefined) check.found.videotitle = videotitle;
  if (description !== undefined) check.found.description = description;
  if (category !== undefined) check.found.category = category;
  if (visibility !== undefined) check.found.visibility = visibility;
  if (tags !== undefined) check.found.tags = String(tags).split(",").map((t) => t.trim()).filter(Boolean);
  await check.found.save();
  return res.status(200).json(check.found);
};

export const deletevideo = async (req, res) => {
  try {
    const { id } = req.params;
    const check = await assertOwner(id, req.userId);
    if (check.error) return res.status(check.error).json({ message: check.msg });

    const videoDoc = check.found;

    // Delete physical media file if exists
    if (videoDoc.filepath) {
      try {
        const cleanPath = String(videoDoc.filepath).replace(/\\/g, "/");
        const serverRoot = path.resolve(__dirname, "..");
        const physicalPath = cleanPath.startsWith("/")
          ? cleanPath
          : path.resolve(serverRoot, cleanPath.startsWith("uploads/") ? cleanPath : `uploads/${cleanPath}`);
        
        if (fs.existsSync(physicalPath)) {
          fs.unlinkSync(physicalPath);
          console.log(`[deletevideo] Deleted physical media: ${physicalPath}`);
        } else {
          // Check if file is directly in server/uploads/basename
          const baseName = path.basename(cleanPath);
          const fallbackPath = path.resolve(serverRoot, "uploads", baseName);
          if (fs.existsSync(fallbackPath)) {
            fs.unlinkSync(fallbackPath);
            console.log(`[deletevideo] Deleted physical media (fallback): ${fallbackPath}`);
          }
        }
      } catch (fsErr) {
        console.error("[deletevideo] Error deleting physical file:", fsErr);
      }
    }

    // Delete MongoDB video record
    await video.findByIdAndDelete(id);

    // Clean up related records (likes, dislikes, watchlater, history)
    await Promise.allSettled([
      like.deleteMany({ videoid: id }),
      dislike.deleteMany({ videoid: id }),
      watchlater.deleteMany({ videoid: id }),
      history.deleteMany({ videoid: id }),
    ]);

    return res.status(200).json({ message: "Video deleted successfully", deleted: true });
  } catch (error) {
    console.error("Error in deletevideo:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getmychannelvideos = async (req, res) => {
  const files = await video.find({ uploader: req.params.channelId });
  return res.status(200).json(files);
};

export const getchannelstats = async (req, res) => {
  try {
    const { channelId } = req.params;
    const videos = await video.find({ uploader: channelId });
    const totalViews = videos.reduce((sum, v) => sum + (v.views || 0), 0);
    const totalLikes = videos.reduce((sum, v) => sum + (v.Like || 0), 0);
    const subscriberCount = await subscription.countDocuments({ channel: channelId });
    const topVideos = [...videos].sort((a, b) => b.views - a.views).slice(0, 5);
    return res.status(200).json({
      totalVideos: videos.length,
      totalViews,
      totalLikes,
      subscriberCount,
      topVideos,
    });
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// Rule-based recommendations (per the brief: no ML, just weighted scoring):
// score = category match + tag match + subscribed channel + watch history similarity
export const getrecommendations = async (req, res) => {
  try {
    const userId = req.params.userId;
    const watched = await history.find({ viewer: userId }).populate("videoid");
    const liked = await like.find({ viewer: userId }).populate("videoid");
    const subs = await subscription.find({ subscriber: userId });

    const watchedCategories = watched.map((h) => h.videoid?.category).filter(Boolean);
    const watchedTags = watched.flatMap((h) => h.videoid?.tags || []);
    const likedCategories = liked.map((l) => l.videoid?.category).filter(Boolean);
    const subscribedChannelIds = subs.map((s) => String(s.channel));
    const watchedIds = watched.map((h) => String(h.videoid?._id));

    const candidates = await video.find({
      visibility: "public",
      _id: { $nin: watchedIds },
    });

    const scored = candidates.map((v) => {
      let score = 0;
      if (watchedCategories.includes(v.category)) score += 2;
      if (likedCategories.includes(v.category)) score += 2;
      if (subscribedChannelIds.includes(String(v.uploader))) score += 3;
      score += (v.tags || []).filter((t) => watchedTags.includes(t)).length;
      return { video: v, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return res.status(200).json(scored.slice(0, 20).map((s) => s.video));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getvideostatus = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    if (!userId) return res.status(200).json({ liked: false, disliked: false, watchLater: false });

    const [isLiked, isDisliked, isWatchLater] = await Promise.all([
      like.findOne({ viewer: userId, videoid: id }),
      dislike.findOne({ viewer: userId, videoid: id }),
      watchlater.findOne({ viewer: userId, videoid: id }),
    ]);

    return res.status(200).json({
      liked: !!isLiked,
      disliked: !!isDisliked,
      watchLater: !!isWatchLater,
    });
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong" });
  }
};

