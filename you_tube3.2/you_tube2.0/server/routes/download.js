import express from "express";
import auth from "../middleware/auth.js";
import { getquota, requestdownload, getmydownloads, filedownload } from "../controllers/download.js";

const routes = express.Router();
routes.get("/quota", auth, getquota);
routes.get("/mine", auth, getmydownloads);
routes.post("/request/:videoId", auth, requestdownload);
routes.get("/file/:videoId", filedownload);
export default routes;
