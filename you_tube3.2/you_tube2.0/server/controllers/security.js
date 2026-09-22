import loginrecord from "../Modals/loginrecord.js";
import trusteddevice from "../Modals/trusteddevice.js";
import users from "../Modals/Auth.js";

export const getloginhistory = async (req, res) => {
  try {
    const history = await loginrecord.find({ user: req.userId }).sort({ createdAt: -1 }).limit(50);
    return res.status(200).json(history);
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const gettrusteddevices = async (req, res) => {
  try {
    const devices = await trusteddevice.find({ user: req.userId, trustedUntil: { $gt: new Date() } }).sort({ createdAt: -1 });
    return res.status(200).json(devices);
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// Lets a user revoke a device's trust early -- next login from it will
// require OTP again.
export const revoketrusteddevice = async (req, res) => {
  try {
    const device = await trusteddevice.findById(req.params.id);
    if (!device || String(device.user) !== req.userId) {
      return res.status(403).json({ message: "Not your device" });
    }
    await trusteddevice.findByIdAndDelete(req.params.id);
    return res.status(200).json({ revoked: true });
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// Once a user manually picks a theme, we stop auto-switching it by login
// time and just respect their explicit choice everywhere, on every device.
export const updatethemepreference = async (req, res) => {
  try {
    const { theme, themeMode } = req.body;
    const update = {};
    if (theme) update.theme = theme;
    update.themeMode = themeMode || "manual";
    const user = await users.findByIdAndUpdate(req.userId, update, { new: true });
    return res.status(200).json({ theme: user.theme, themeMode: user.themeMode });
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong" });
  }
};
