import express from "express";
import auth from "../middleware/auth.js";
import optionalAuth from "../middleware/optionalAuth.js";
import {
  createplaylist, getmyplaylists, getplaylistbyid,
  renameplaylist, deleteplaylist, addvideotoplaylist, removevideofromplaylist,
} from "../controllers/playlist.js";

const routes = express.Router();
routes.post("/", auth, createplaylist);
routes.get("/mine/:userId", auth, getmyplaylists);
routes.get("/:id", optionalAuth, getplaylistbyid);
routes.patch("/:id/rename", auth, renameplaylist);
routes.delete("/:id", auth, deleteplaylist);
routes.post("/:id/add", auth, addvideotoplaylist);
routes.post("/:id/remove", auth, removevideofromplaylist);
export default routes;
