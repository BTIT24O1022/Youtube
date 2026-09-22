import express from "express";
import { handlelike, getallLikedVideo } from "../controllers/like.js";
import auth from "../middleware/auth.js";

const routes = express.Router();
routes.get("/:userId", auth, getallLikedVideo);
routes.post("/:videoId", auth, handlelike);
export default routes;
