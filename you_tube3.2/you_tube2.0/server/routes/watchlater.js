import express from "express";
import {
  getallwatchlater,
  handlewatchlater,
} from "../controllers/watchlater.js";
import auth from "../middleware/auth.js";

const routes = express.Router();
routes.get("/:userId", auth, getallwatchlater);
routes.post("/:videoId", auth, handlewatchlater);
export default routes;
