import express from "express";
import auth from "../middleware/auth.js";
import { getloginhistory, gettrusteddevices, revoketrusteddevice, updatethemepreference } from "../controllers/security.js";

const routes = express.Router();
routes.get("/login-history", auth, getloginhistory);
routes.get("/trusted-devices", auth, gettrusteddevices);
routes.delete("/trusted-devices/:id", auth, revoketrusteddevice);
routes.patch("/theme", auth, updatethemepreference);
export default routes;
