import express from "express";
import {
  getprofile,
  login,
  sendLoginOtp,
  updateprofile,
  verifyLoginOtp,
} from "../controllers/auth.js";
const routes = express.Router();

routes.post("/login", login);
routes.post("/send-otp", sendLoginOtp);
routes.post("/verify-otp", verifyLoginOtp);
routes.get("/profile/:id", getprofile);
routes.patch("/update/:id", updateprofile);
export default routes;
