import report from "../Modals/report.js";
import video from "../Modals/video.js";

export const createreport = async (req, res) => {
  try {
    const { videoId, commentId, reason } = req.body;
    if (!videoId && !commentId) {
      return res.status(400).json({ message: "Nothing specified to report" });
    }
    // Duplicate-report guard: if this person already reported this exact
    // thing and it's still pending review, don't create a second row --
    // just let them know it's already been flagged.
    const existing = await report.findOne({
      reporter: req.userId,
      ...(videoId ? { videoid: videoId } : { commentid: commentId }),
      status: "pending",
    });
    if (existing) {
      return res.status(200).json({ message: "You've already reported this — it's pending review.", duplicate: true });
    }
    const created = await report.create({
      reporter: req.userId,
      videoid: videoId || undefined,
      commentid: commentId || undefined,
      reason,
    });
    return res.status(201).json(created);
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong" });
  }
};
