import express from "express";
import auth from "../middleware/auth.js";
import { generatedescription, generatetags } from "../controllers/ai.js";

const routes = express.Router();
routes.post("/description", auth, generatedescription);
routes.post("/tags", auth, generatetags);
export default routes;
