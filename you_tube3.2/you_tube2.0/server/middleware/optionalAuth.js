import jwt from "jsonwebtoken";

// Like `auth`, but doesn't reject the request if there's no token — it just
// leaves req.userId undefined. Used for routes that work for logged-out
// visitors but show extra info (e.g. "am I subscribed?") when logged in.
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const decoded = jwt.verify(authHeader.split(" ")[1], process.env.JWT_SECRET);
      req.userId = decoded.id;
    } catch (error) {
      // invalid/expired token -> just treat as logged out, don't block the request
    }
  }
  next();
};
export default optionalAuth;
