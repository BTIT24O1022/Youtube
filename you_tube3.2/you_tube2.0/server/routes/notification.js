import express from "express";
import auth from "../middleware/auth.js";
import { getmynotifications, markread } from "../controllers/notification.js";

const routes = express.Router();
routes.get("/", auth, getmynotifications);
routes.patch("/read", auth, markread);
export default routes;
