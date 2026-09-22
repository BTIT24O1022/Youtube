import express from "express";
import { login, updateprofile, verifyLoginOtp, getuserbyid } from "../controllers/auth.js";
import auth from "../middleware/auth.js";
const routes = express.Router();

routes.post("/login", login);
routes.post("/verify-login-otp", verifyLoginOtp);
routes.patch("/update/:id", auth, updateprofile);
routes.get("/:id", getuserbyid);
export default routes;
