import video from "../Modals/video.js";
import like from "../Modals/like.js";
import dislike from "../Modals/dislike.js";

export const handledislike = async (req, res) => {
  const userId = req.userId;
  const { videoId } = req.params;
  try {
    const exisitingdislike = await dislike.findOne({
      viewer: userId,
      videoid: videoId,
    });

    let disliked;
    if (exisitingdislike) {
      // Already disliked -> clicking again removes the dislike.
      await dislike.findByIdAndDelete(exisitingdislike._id);
      await video.findByIdAndUpdate(videoId, { $inc: { Dislike: -1 } });
      disliked = false;
    } else {
      await dislike.create({ viewer: userId, videoid: videoId });
      await video.findByIdAndUpdate(videoId, { $inc: { Dislike: 1 } });
      disliked = true;

      // Mirror of the like controller: disliking clears any existing like
      // from this user, since a video can't be both liked and disliked by
      // the same person at once.
      const exisitinglike = await like.findOne({
        viewer: userId,
        videoid: videoId,
      });
      if (exisitinglike) {
        await like.findByIdAndDelete(exisitinglike._id);
        await video.findByIdAndUpdate(videoId, { $inc: { Like: -1 } });
      }
    }

    const updatedVideo = await video.findById(videoId);
    return res.status(200).json({
      disliked,
      likeCount: updatedVideo.Like,
      dislikeCount: updatedVideo.Dislike,
    });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
