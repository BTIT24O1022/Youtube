import video from "../Modals/video.js";
import like from "../Modals/like.js";
import dislike from "../Modals/dislike.js";
import { createNotification } from "../filehelper/notify.js";

export const handlelike = async (req, res) => {
  const userId = req.userId;
  const { videoId } = req.params;
  try {
    const exisitinglike = await like.findOne({
      viewer: userId,
      videoid: videoId,
    });

    let liked;
    if (exisitinglike) {
      // Already liked -> clicking again removes the like.
      await like.findByIdAndDelete(exisitinglike._id);
      await video.findByIdAndUpdate(videoId, { $inc: { Like: -1 } });
      liked = false;
    } else {
      await like.create({ viewer: userId, videoid: videoId });
      await video.findByIdAndUpdate(videoId, { $inc: { Like: 1 } });
      liked = true;

      const likedVideo = await video.findById(videoId);
      // Only send notification if the video has a valid uploader and it's not the liker themselves
      if (likedVideo?.uploader && String(likedVideo.uploader) !== String(userId)) {
        await createNotification(req.app.get("io"), {
          recipient: likedVideo.uploader,
          sender: userId,
          type: "like",
          videoid: videoId,
          message: "Someone liked your video",
        });
      }

      // A video can't be both liked and disliked by the same person, so
      // adding a like clears any existing dislike from this user.
      const exisitingdislike = await dislike.findOne({
        viewer: userId,
        videoid: videoId,
      });
      if (exisitingdislike) {
        await dislike.findByIdAndDelete(exisitingdislike._id);
        await video.findByIdAndUpdate(videoId, { $inc: { Dislike: -1 } });
      }
    }

    // Read back the current counts so the frontend can trust the response
    // instead of doing its own +1/-1 math (which drifts if two tabs are open).
    const updatedVideo = await video.findById(videoId);
    return res.status(200).json({
      liked,
      likeCount: updatedVideo.Like,
      dislikeCount: updatedVideo.Dislike,
    });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getallLikedVideo = async (req, res) => {
  const { userId } = req.params;
  if (userId !== req.userId) {
    return res.status(403).json({ message: "You can only view your own liked videos" });
  }
  try {
    const likevideo = await like
      .find({ viewer: userId })
      .populate({
        path: "videoid",
        model: "videofiles",
      })
      .exec();
    return res.status(200).json(likevideo);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
