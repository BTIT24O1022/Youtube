import express from "express";
import auth from "../middleware/auth.js";
import {
  getplans, getmysubscription, getbillinghistory,
  createorder, verifypayment, cancelorder, cancelsubscription,
} from "../controllers/billing.js";

const routes = express.Router();
routes.get("/plans", getplans);
routes.get("/subscription", auth, getmysubscription);
routes.get("/history", auth, getbillinghistory);
routes.post("/create-order", auth, createorder);
routes.post("/verify", auth, verifypayment);
routes.post("/cancel-order", auth, cancelorder);
routes.post("/cancel-subscription", auth, cancelsubscription);
export default routes;
