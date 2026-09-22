import express from "express";
import { handlesubscribe, getsubscriptionstatus, getmysubscriptions } from "../controllers/subscription.js";
import auth from "../middleware/auth.js";
import optionalAuth from "../middleware/optionalAuth.js";

const routes = express.Router();
routes.post("/:channelId", auth, handlesubscribe);
routes.get("/status/:channelId", optionalAuth, getsubscriptionstatus);
routes.get("/mine/:userId", auth, getmysubscriptions);
export default routes;
