import express from "express";
import { translatetext } from "../controllers/translate.js";

const routes = express.Router();
// Left public (no auth) since it's a stateless text passthrough that
// doesn't read or write any user data.
routes.post("/", translatetext);
export default routes;
