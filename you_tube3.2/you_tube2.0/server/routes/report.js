import express from "express";
import auth from "../middleware/auth.js";
import { createreport } from "../controllers/report.js";

const routes = express.Router();
routes.post("/", auth, createreport);
export default routes;
