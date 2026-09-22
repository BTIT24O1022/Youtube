import notification from "../Modals/notification.js";

export const getmynotifications = async (req, res) => {
  try {
    const notifs = await notification.find({ recipient: req.userId }).sort({ createdAt: -1 }).limit(50);
    return res.status(200).json(notifs);
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const markread = async (req, res) => {
  try {
    await notification.updateMany({ recipient: req.userId, read: false }, { $set: { read: true } });
    return res.status(200).json({ marked: true });
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong" });
  }
};
