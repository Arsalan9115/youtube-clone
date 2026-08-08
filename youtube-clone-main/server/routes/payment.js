import express from "express";

import {
  createPlanOrder,
  verifyPlanPayment,
} from "../controllers/payment.js";
import { requireAuth } from "../middleware/auth.js";

const routes = express.Router();

routes.post("/plans/order", requireAuth, (req, res, next) => {
  req.body.userId = req.userId;
  return createPlanOrder(req, res, next);
});
routes.post("/plans/verify", requireAuth, (req, res, next) => {
  req.body.userId = req.userId;
  return verifyPlanPayment(req, res, next);
});

export default routes;
