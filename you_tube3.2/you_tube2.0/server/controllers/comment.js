import comment from "../Modals/comment.js";
import commentlike from "../Modals/commentlike.js";
import commentdislike from "../Modals/commentdislike.js";
import video from "../Modals/video.js";
import mongoose from "mongoose";
import { createNotification } from "../filehelper/notify.js";
import { containsProfanityOrAbuse, containsLink, isSymbolFlood, recordAndCheckRate } from "../filehelper/moderation.js";
import { createCaptcha, verifyCaptcha } from "../filehelper/captcha.js";
import { geolocateIp } from "../filehelper/geolocate.js";

// A comment can be edited or deleted by its author only within this window
// after posting -- matches "edit/delete within a specified time limit".
const EDIT_WINDOW_MS = 15 * 60 * 1000;
const withinEditWindow = (c) => Date.now() - new Date(c.commentedon).getTime() < EDIT_WINDOW_MS;

export const getcaptcha = (req, res) => {
  return res.status(200).json(createCaptcha());
};

export const postcomment = async (req, res) => {
  const { videoid, commentbody, usercommented, userimage, parentId, captchaId, captchaAnswer } = req.body;

  // --- Moderation pipeline (all rule-based heuristics, run before saving) ---

  // 1) Duplicate check: same user posting the exact same text on the same
  // video again within the last 5 minutes gets rejected outright.
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
  const duplicate = await comment.findOne({
    userid: req.userId,
    videoid,
    commentbody,
    commentedon: { $gte: fiveMinAgo },
  });
  if (duplicate) {
    return res.status(429).json({ message: "You've already posted this comment recently." });
  }

  // 2) Rate limiting: after 5 comments/min we require a solved CAPTCHA;
  // after 12/min we hard-block regardless of CAPTCHA.
  const rate = recordAndCheckRate(req.userId);
  if (rate.blocked) {
    return res.status(429).json({ message: "You're commenting too fast. Please wait a minute." });
  }
  if (rate.needsCaptcha) {
    if (!captchaId || captchaAnswer === undefined) {
      return res.status(428).json({
        message: "Please solve the CAPTCHA to continue commenting.",
        requireCaptcha: true,
        captcha: createCaptcha(),
      });
    }
    if (!verifyCaptcha(captchaId, captchaAnswer)) {
      return res.status(400).json({
        message: "Incorrect CAPTCHA answer, try again.",
        requireCaptcha: true,
        captcha: createCaptcha(),
      });
    }
  }

  // 3) Content flags (these don't block posting, just mark for review) --
  // a real ML moderation model would replace this, but this is a
  // reasonable rule-based stand-in per the brief.
  const flagged =
    containsProfanityOrAbuse(commentbody) ||
    containsLink(commentbody) ||
    isSymbolFlood(commentbody);

  // Best-effort location lookup -- never blocks the comment if it fails.
  const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;
  const location = await geolocateIp(ip);

  const postedcomment = new comment({
    videoid,
    commentbody,
    usercommented,
    userimage,
    parentId: parentId || null,
    userid: req.userId,
    flagged,
    location,
  });

  try {
    await postedcomment.save();

    const vid = await video.findById(videoid);
    if (parentId) {
      const parent = await comment.findById(parentId);
      if (parent) {
        await createNotification(req.app.get("io"), {
          recipient: parent.userid,
          sender: req.userId,
          type: "reply",
          videoid,
          message: `${usercommented || "Someone"} replied to your comment`,
        });
      }
    } else if (vid) {
      await createNotification(req.app.get("io"), {
        recipient: vid.uploader,
        sender: req.userId,
        type: "comment",
        videoid,
        message: `${usercommented || "Someone"} commented on your video`,
      });
    }

    req.app.get("io")?.to(`video_${videoid}`).emit("new_comment", postedcomment);

    return res.status(200).json({ comment: postedcomment, flagged });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// sort: newest (default) | oldest | mostliked | relevant
// "relevant" is a simple heuristic: likes weigh more than age, so a popular
// older comment can still outrank a brand-new unliked one.
export const getallcomment = async (req, res) => {
  const { videoid } = req.params;
  const { sort = "newest" } = req.query;
  try {
    let comments = await comment.find({ videoid: videoid }).lean();

    if (sort === "oldest") {
      comments.sort((a, b) => new Date(a.commentedon) - new Date(b.commentedon));
    } else if (sort === "mostliked") {
      comments.sort((a, b) => (b.Like || 0) - (a.Like || 0));
    } else if (sort === "relevant") {
      const now = Date.now();
      const score = (c) => {
        const ageHours = (now - new Date(c.commentedon).getTime()) / 3600000;
        return (c.Like || 0) * 3 - ageHours * 0.05;
      };
      comments.sort((a, b) => score(b) - score(a));
    } else {
      comments.sort((a, b) => new Date(a.commentedon) - new Date(b.commentedon));
    }

    return res.status(200).json(comments);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const handlecommentlike = async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;
  try {
    const existing = await commentlike.findOne({ viewer: userId, commentid: id });
    let liked;
    if (existing) {
      await commentlike.findByIdAndDelete(existing._id);
      await comment.findByIdAndUpdate(id, { $inc: { Like: -1 } });
      liked = false;
    } else {
      await commentlike.create({ viewer: userId, commentid: id });
      await comment.findByIdAndUpdate(id, { $inc: { Like: 1 } });
      liked = true;
      // A comment can't be both liked and disliked by the same person.
      const existingDislike = await commentdislike.findOne({ viewer: userId, commentid: id });
      if (existingDislike) {
        await commentdislike.findByIdAndDelete(existingDislike._id);
        await comment.findByIdAndUpdate(id, { $inc: { Dislike: -1 } });
      }
    }
    const updated = await comment.findById(id);
    return res.status(200).json({ liked, likeCount: updated.Like, dislikeCount: updated.Dislike });
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const handlecommentdislike = async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;
  try {
    const existing = await commentdislike.findOne({ viewer: userId, commentid: id });
    let disliked;
    if (existing) {
      await commentdislike.findByIdAndDelete(existing._id);
      await comment.findByIdAndUpdate(id, { $inc: { Dislike: -1 } });
      disliked = false;
    } else {
      await commentdislike.create({ viewer: userId, commentid: id });
      await comment.findByIdAndUpdate(id, { $inc: { Dislike: 1 } });
      disliked = true;
      const existingLike = await commentlike.findOne({ viewer: userId, commentid: id });
      if (existingLike) {
        await commentlike.findByIdAndDelete(existingLike._id);
        await comment.findByIdAndUpdate(id, { $inc: { Like: -1 } });
      }
    }
    const updated = await comment.findById(id);
    return res.status(200).json({ disliked, likeCount: updated.Like, dislikeCount: updated.Dislike });
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const deletecomment = async (req, res) => {
  const { id: _id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("comment unavailable");
  }
  try {
    const existingComment = await comment.findById(_id);
    if (!existingComment) {
      return res.status(404).json({ message: "Comment not found" });
    }
    if (existingComment.userid.toString() !== req.userId) {
      return res.status(403).json({ message: "You can only delete your own comment" });
    }
    if (!withinEditWindow(existingComment)) {
      return res.status(403).json({ message: "The time window to delete this comment has passed" });
    }
    await comment.deleteMany({ parentId: _id });
    await comment.findByIdAndDelete(_id);
    return res.status(200).json({ comment: true });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const editcomment = async (req, res) => {
  const { id: _id } = req.params;
  const { commentbody, lastKnownUpdatedAt } = req.body;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("comment unavailable");
  }
  try {
    const existingComment = await comment.findById(_id);
    if (!existingComment) {
      return res.status(404).json({ message: "Comment not found" });
    }
    if (existingComment.userid.toString() !== req.userId) {
      return res.status(403).json({ message: "You can only edit your own comment" });
    }
    if (!withinEditWindow(existingComment)) {
      return res.status(403).json({ message: "The time window to edit this comment has passed" });
    }
    // Simultaneous-edit guard: if the comment was modified after this
    // editor last fetched it (e.g. edited from another tab/device), refuse
    // to silently overwrite -- tell the client to refresh and retry.
    if (lastKnownUpdatedAt && new Date(lastKnownUpdatedAt).getTime() !== new Date(existingComment.updatedAt).getTime()) {
      return res.status(409).json({ message: "This comment was changed elsewhere. Please refresh and try again." });
    }
    const updatecomment = await comment.findByIdAndUpdate(
      _id,
      {
        $set: {
          commentbody,
          edited: true,
          flagged: containsProfanityOrAbuse(commentbody) || containsLink(commentbody) || isSymbolFlood(commentbody),
        },
      },
      { new: true }
    );
    res.status(200).json(updatecomment);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
