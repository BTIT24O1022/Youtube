import users from "../Modals/Auth.js";

// Runs AFTER the `auth` middleware, so req.userId is already set and verified.
// This just adds the extra check "...and is that user an admin?"
const isAdmin = async (req, res, next) => {
  try {
    const user = await users.findById(req.userId);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }
    next();
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export default isAdmin;
