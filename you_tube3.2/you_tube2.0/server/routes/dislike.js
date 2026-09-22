import express from "express";
import { handledislike } from "../controllers/dislike.js";
import auth from "../middleware/auth.js";

const routes = express.Router();
routes.post("/:videoId", auth, handledislike);
export default routes;
