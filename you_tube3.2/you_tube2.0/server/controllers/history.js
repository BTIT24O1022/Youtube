import video from "../Modals/video.js";
import history from "../Modals/history.js";

// Records that a user watched a video, and view-counts it. Uses upsert so
// re-watching the same video updates the existing history entry instead of
// creating duplicates -- this is also what "Continue Watching" reads from.
export const handlehistory = async (req, res) => {
  const userId = req.userId;
  const { videoId } = req.params;
  try {
    const existing = await history.findOne({ viewer: userId, videoid: videoId });
    if (!existing) {
      await history.create({ viewer: userId, videoid: videoId });
      await video.findByIdAndUpdate(videoId, { $inc: { views: 1 } });
    } else {
      existing.likedon = new Date();
      await existing.save();
    }
    return res.status(200).json({ history: true });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// Called periodically by the video player (e.g. every 10s) to remember
// playback position, so "Continue Watching" can resume where they left off.
export const updateprogress = async (req, res) => {
  const userId = req.userId;
  const { videoId } = req.params;
  const { progress, duration } = req.body;
  try {
    const completed = duration > 0 && progress / duration >= 0.9;
    await history.findOneAndUpdate(
      { viewer: userId, videoid: videoId },
      { progress, duration, completed, likedon: new Date() },
      { upsert: true }
    );
    return res.status(200).json({ saved: true, completed });
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getprogress = async (req, res) => {
  const userId = req.userId;
  const { videoId } = req.params;
  try {
    const existing = await history.findOne({ viewer: userId, videoid: videoId });
    return res.status(200).json({ progress: existing?.progress || 0, duration: existing?.duration || 0 });
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const handleview = async (req, res) => {
  const { videoId } = req.params;
  try {
    await video.findByIdAndUpdate(videoId, { $inc: { views: 1 } });
    return res.status(200).json({ counted: true });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getallhistoryVideo = async (req, res) => {
  const { userId } = req.params;
  if (userId !== req.userId) {
    return res.status(403).json({ message: "You can only view your own history" });
  }
  try {
    const historyvideo = await history
      .find({ viewer: userId })
      .sort({ likedon: -1 })
      .populate({ path: "videoid", model: "videofiles" })
      .exec();
    return res.status(200).json(historyvideo);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const deletehistory = async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await history.findById(id);
    if (!existing) return res.status(404).json({ message: "History item not found" });
    if (existing.viewer.toString() !== req.userId) {
      return res.status(403).json({ message: "Forbidden" });
    }
    await history.findByIdAndDelete(id);
    return res.status(200).json({ deleted: true });
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong" });
  }
};

