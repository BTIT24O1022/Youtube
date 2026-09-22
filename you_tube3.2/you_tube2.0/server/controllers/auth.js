import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { UAParser } from "ua-parser-js";
import users from "../Modals/Auth.js";
import loginrecord from "../Modals/loginrecord.js";
import trusteddevice from "../Modals/trusteddevice.js";
import loginotp from "../Modals/loginotp.js";
import { geolocateIpDetailed } from "../filehelper/geolocate.js";
import { sendOtpEmail } from "../filehelper/mailer.js";

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

const TRUSTED_DAYS = Number(process.env.TRUSTED_DEVICE_DAYS) || 30;
const hashCode = (code) => crypto.createHash("sha256").update(code).digest("hex");
const genDeviceToken = () => crypto.randomBytes(24).toString("hex");

// "auto" theme: light between 5:00 AM and 12:00 PM IST, dark otherwise.
// IST is UTC+5:30 with no daylight saving, so this offset is always correct.
const computeAutoTheme = () => {
  const now = new Date();
  const istMinutes = ((now.getUTCHours() * 60 + now.getUTCMinutes() + 330) % 1440);
  const istHour = Math.floor(istMinutes / 60);
  return istHour >= 5 && istHour < 12 ? "light" : "dark";
};

const parseClientInfo = (req) => {
  const parser = new UAParser(req.headers["user-agent"]);
  const result = parser.getResult();
  const ip = (req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress || "").trim();
  return {
    ip,
    browser: result.browser.name || "Unknown",
    browserVersion: result.browser.version || "",
    os: result.os.name || "Unknown",
    deviceType: result.device.type === "mobile" ? "Mobile" : result.device.type === "tablet" ? "Tablet" : "Desktop",
    deviceModel: result.device.model || "",
  };
};

const themeResponse = (user) => ({
  theme: user.themeMode === "auto" ? computeAutoTheme() : user.theme,
  themeMode: user.themeMode,
});

export const login = async (req, res) => {
  const { email, name, image, deviceToken } = req.body;

  try {
    let user = await users.findOne({ email });
    if (!user) {
      user = await users.create({ email, name, image });
    }

    const info = parseClientInfo(req);
    const geo = await geolocateIpDetailed(info.ip);
    const newDeviceToken = deviceToken || genDeviceToken();

    await loginrecord.create({ user: user._id, ...info, ...geo, status: "logged_in" });
    if (user.themeMode === "auto") {
      user.theme = computeAutoTheme();
      await user.save();
    }
    const token = generateToken(user._id);
    return res.status(200).json({ result: user, token, deviceToken: newDeviceToken, ...themeResponse(user) });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const verifyLoginOtp = async (req, res) => {
  const { otpId, code, deviceToken, trustDevice } = req.body;
  try {
    const otp = await loginotp.findById(otpId);
    if (!otp || otp.consumed) {
      return res.status(400).json({ message: "This code is no longer valid. Please try logging in again." });
    }
    if (new Date() > otp.expiresAt) {
      await loginrecord.findByIdAndUpdate(otp.loginRecordId, { status: "otp_failed" });
      return res.status(400).json({ message: "This code has expired. Please try logging in again." });
    }
    if (otp.attempts >= 5) {
      return res.status(429).json({ message: "Too many incorrect attempts. Please try logging in again." });
    }
    if (hashCode(code) !== otp.codeHash) {
      otp.attempts += 1;
      await otp.save();
      return res.status(400).json({ message: "Incorrect code. Please try again." });
    }

    otp.consumed = true;
    await otp.save();
    await loginrecord.findByIdAndUpdate(otp.loginRecordId, { status: "otp_verified" });

    const user = await users.findById(otp.user);

    if (trustDevice) {
      const record = await loginrecord.findById(otp.loginRecordId);
      await trusteddevice.findOneAndUpdate(
        { user: user._id, deviceToken: otp.deviceToken },
        {
          trustedUntil: new Date(Date.now() + TRUSTED_DAYS * 86400000),
          browser: record ? `${record.browser} on ${record.os}` : req.headers["user-agent"],
          ip: record?.ip || "",
          city: record?.city || "",
          state: record?.state || "",
          country: record?.country || "",
        },
        { upsert: true }
      );
    }

    if (user.themeMode === "auto") {
      user.theme = computeAutoTheme();
      await user.save();
    }

    const token = generateToken(user._id);
    return res.status(200).json({ result: user, token, deviceToken: otp.deviceToken, ...themeResponse(user) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const updateprofile = async (req, res) => {
  const { id: _id } = req.params;
  const { channelname, description } = req.body;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(500).json({ message: "User unavailable..." });
  }
  if (_id !== req.userId) {
    return res.status(403).json({ message: "You can only edit your own profile" });
  }
  try {
    const updateduser = await users.findByIdAndUpdate(
      _id,
      { $set: { channelname, description } },
      { new: true }
    );
    return res.status(200).json({ result: updateduser });
  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getuserbyid = async (req, res) => {
  const { id } = req.params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ message: "User not found" });
  }
  try {
    const user = await users.findById(id).select("-__v");
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.status(200).json(user);
  } catch (error) {
    console.error("Get user error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
