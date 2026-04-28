import mongoose from "mongoose";
import { DEFAULT_PLAN_CODE, getPlanByCode } from "../config/plans.js";

const defaultPlan = getPlanByCode(DEFAULT_PLAN_CODE);

const userschema = mongoose.Schema({
  email: { type: String, required: true },
  mobileNumber: { type: String },
  name: { type: String },
  city: { type: String },
  state: { type: String },
  otpChannel: {
    type: String,
    enum: ["email", "mobile"],
  },
  otpCodeHash: { type: String },
  otpExpiresAt: { type: Date },
  otpVerifiedAt: { type: Date },
  channelname: { type: String },
  description: { type: String },
  image: { type: String },
  isPremium: { type: Boolean, default: false },
  premiumSince: { type: Date },
  currentPlan: {
    type: String,
    enum: ["free", "bronze", "silver", "gold"],
    default: DEFAULT_PLAN_CODE,
  },
  watchLimitSeconds: {
    type: Number,
    default: defaultPlan.watchLimitSeconds,
  },
  joinedon: { type: Date, default: Date.now },
});

export default mongoose.model("user", userschema);
