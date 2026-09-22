import jwt from "jsonwebtoken";

// This middleware runs BEFORE a controller, for any route that needs
// "the person must be logged in" protection.
//
// How it works:
// 1. The frontend sends the JWT it got at login in the request header:
//      Authorization: Bearer <token>
// 2. We verify that token was signed by OUR server using JWT_SECRET.
//    If someone tampers with it or makes one up, verification fails.
// 3. If it's valid, we attach the real user id to req.userId so that
//    every controller downstream can trust it — instead of trusting
//    whatever "userId" the client put in the request body (which anyone
//    could fake with a tool like Postman).
const auth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token, authorization denied" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token is invalid or expired" });
  }
};

export default auth;
