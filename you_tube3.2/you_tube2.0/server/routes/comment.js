import express from "express";
import { deletecomment, getallcomment, postcomment, editcomment, getcaptcha, handlecommentlike, handlecommentdislike } from "../controllers/comment.js";
import auth from "../middleware/auth.js";

const routes = express.Router();
routes.get("/captcha", getcaptcha);
routes.get("/:videoid", getallcomment);
routes.post("/postcomment", auth, postcomment);
routes.delete("/deletecomment/:id", auth, deletecomment);
routes.post("/editcomment/:id", auth, editcomment);
routes.post("/like/:id", auth, handlecommentlike);
routes.post("/dislike/:id", auth, handlecommentdislike);
export default routes;
