import express from "express";
import {
  getallhistoryVideo,
  handlehistory,
  handleview,
  updateprogress,
  getprogress,
  deletehistory,
} from "../controllers/history.js";
import auth from "../middleware/auth.js";

const routes = express.Router();
routes.get("/:userId", auth, getallhistoryVideo);
// Not protected: even a logged-out visitor's view should still count,
// same as on real YouTube.
routes.post("/views/:videoId", handleview);
routes.post("/:videoId", auth, handlehistory);
routes.post("/progress/:videoId", auth, updateprogress);
routes.get("/progress/:videoId", auth, getprogress);
routes.delete("/:id", auth, deletehistory);
export default routes;
