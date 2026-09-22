import express from "express";
import auth from "../middleware/auth.js";
import isAdmin from "../middleware/isAdmin.js";
import {
  getadminstats, getusers, toggleblockuser, admindeletevideo, getreports, updatereportstatus,
} from "../controllers/admin.js";

const routes = express.Router();
routes.use(auth, isAdmin); // every admin route requires both a valid token AND role=admin
routes.get("/stats", getadminstats);
routes.get("/users", getusers);
routes.patch("/users/:id/block", toggleblockuser);
routes.delete("/videos/:id", admindeletevideo);
routes.get("/reports", getreports);
routes.patch("/reports/:id", updatereportstatus);
export default routes;
