import users from "../Modals/Auth.js";
import video from "../Modals/video.js";
import comment from "../Modals/comment.js";
import report from "../Modals/report.js";

export const getadminstats = async (req, res) => {
  try {
    const [totalUsers, totalVideos, totalComments, totalReports] = await Promise.all([
      users.countDocuments(),
      video.countDocuments(),
      comment.countDocuments(),
      report.countDocuments({ status: "pending" }),
    ]);
    return res.status(200).json({ totalUsers, totalVideos, totalComments, totalReports });
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getusers = async (req, res) => {
  const list = await users.find().select("-__v");
  return res.status(200).json(list);
};

export const toggleblockuser = async (req, res) => {
  const user = await users.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });
  user.blocked = !user.blocked;
  await user.save();
  return res.status(200).json(user);
};

export const admindeletevideo = async (req, res) => {
  await video.findByIdAndDelete(req.params.id);
  return res.status(200).json({ deleted: true });
};

export const getreports = async (req, res) => {
  const reports = await report.find().populate("reporter", "name email").populate("videoid", "videotitle");
  return res.status(200).json(reports);
};

export const updatereportstatus = async (req, res) => {
  const updated = await report.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
  return res.status(200).json(updated);
};
