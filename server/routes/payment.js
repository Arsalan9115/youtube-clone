import express from "express";

import {
  createPlanOrder,
  verifyPlanPayment,
} from "../controllers/payment.js";

const routes = express.Router();

routes.post("/plans/order", createPlanOrder);
routes.post("/plans/verify", verifyPlanPayment);

export default routes;
