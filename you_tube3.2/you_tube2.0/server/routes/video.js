import express from "express";
import {
  getallvideo, uploadvideo, getvideobyid, searchvideos,
  updatevideo, deletevideo, getmychannelvideos, getrecommendations, getchannelstats, getvideostatus,
} from "../controllers/video.js";
import upload from "../filehelper/filehelper.js";
import auth from "../middleware/auth.js";

const routes = express.Router();

const uploadSingleVideo = (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: "Video size must not exceed 300 MB." });
      }
      return res.status(400).json({ message: err.message || "File upload failed" });
    }
    next();
  });
};

routes.post("/upload", auth, uploadSingleVideo, uploadvideo);
routes.get("/getall", getallvideo);
routes.get("/search", searchvideos);
routes.get("/recommendations/:userId", getrecommendations);
routes.get("/channel/:channelId/stats", getchannelstats);
routes.get("/channel/:channelId", getmychannelvideos);
routes.get("/status/:id", auth, getvideostatus);
routes.get("/:id", getvideobyid);
routes.patch("/:id", auth, updatevideo);
routes.delete("/:id", auth, deletevideo);
export default routes;
