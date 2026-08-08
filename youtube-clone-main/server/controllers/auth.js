import crypto from "crypto";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import users from "../models/Auth.js";
import { isSouthIndianState } from "../config/regions.js";
import { sendOtpEmail } from "../services/email.js";
import { sendOtpSms } from "../services/sms.js";

const OTP_EXPIRY_MS = 10 * 60 * 1000;

const buildOtp = () => String(Math.floor(100000 + Math.random() * 900000));
const hashOtp = (otp) => crypto.createHash("sha256").update(otp).digest("hex");
const createToken = (userId) => jwt.sign({ userId: String(userId) }, process.env.JWT_SECRET, { expiresIn: "7d" });

// =======================================================
// 1. DYNAMIC REGIONAL THEME API (SYNCED WITH CLIENT TIME)
// =======================================================
export const getRegionTheme = async (req, res) => {
  try {
    // 1. Pehle client (browser) ka hour check karein, warna server hour fallback
    const clientHourParam = req.query.clientHour;
    const currentHour = (clientHourParam !== undefined && !isNaN(clientHourParam))
      ? parseInt(clientHourParam, 10)
      : new Date().getHours();
    
    // Check 10:00 AM to 12:00 PM Window (Hours 10 and 11)
    const isMorningSlot = currentHour >= 10 && currentHour < 12;

    // Get User State from query, headers, or middleware location
    const userState = req.query.state || req.location?.region || "";
    const isSouth = isSouthIndianState(userState);

    // Rule: Light theme ONLY IF South India AND Time is between 10 AM - 12 PM
    const theme = (isSouth && isMorningSlot) ? "light" : "dark";

    return res.status(200).json({ 
      theme,
      isSouth,
      isMorningSlot,
      appliedHour: currentHour
    });
  } catch (error) {
    console.error("Region theme error:", error);
    return res.status(200).json({ theme: "dark" });
  }
};

// =======================================================
// 2. USER LOGIN / SYNCHRONIZATION
// =======================================================
export const login = async (req, res) => {
  const { city, email, name, image, mobileNumber, state } = req.body;

  try {
    const existingUser = await users.findOne({ email });

    if (!existingUser) {
      const newUser = await users.create({
        city,
        email,
        image,
        mobileNumber,
        name,
        state,
      });
      return res.status(201).json({ result: newUser });
    } else {
      existingUser.name = name || existingUser.name;
      existingUser.image = image || existingUser.image;
      existingUser.mobileNumber = mobileNumber || existingUser.mobileNumber;
      existingUser.state = state || existingUser.state;
      existingUser.city = city || existingUser.city;
      await existingUser.save();
      return res.status(200).json({ result: existingUser });
    }
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// =======================================================
// 3. SEND OTP (REGIONAL: EMAIL FOR SOUTH, SMS FOR OTHERS)
// =======================================================
export const sendLoginOtp = async (req, res) => {
  const { email, mobileNumber, name } = req.body;
  const city = req.location?.city || req.body.city;
  const state = req.location?.region || req.body.state;

  if (!city || !email || !mobileNumber || !name || !state) {
    return res.status(400).json({
      message: "Name, email, mobile number, city, and state are required.",
    });
  }

  const otp = buildOtp();
  const otpChannel = isSouthIndianState(state) ? "email" : "mobile";
  const otpCodeHash = hashOtp(otp);
  const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

  try {
    let deliveryResult;

    const user = await users.findOneAndUpdate(
      { email },
      {
        $set: {
          email,
          mobileNumber,
          name,
          city,
          otpChannel,
          otpCodeHash,
          otpExpiresAt,
          state,
        },
      },
      { new: true, upsert: true }
    );

    if (otpChannel === "email") {
      const emailResult = await sendOtpEmail({ email, name, otp, state });
      deliveryResult = emailResult;

      if (emailResult.skipped) {
        return res.status(503).json({
          message:
            "Email OTP is not configured yet. Add SMTP credentials to enable this flow.",
        });
      }
    } else {
      const smsResult = await sendOtpSms({ mobileNumber, otp });
      deliveryResult = smsResult;

      if (smsResult.skipped) {
        return res.status(503).json({
          debugOtp: process.env.OTP_DEBUG_MODE === "true" ? otp : undefined,
          message:
            "Mobile OTP is not configured yet. Add Twilio credentials to enable SMS delivery.",
        });
      }
    }

    return res.status(200).json({
      deliveryChannel: otpChannel,
      debugOtp:
        deliveryResult?.simulated || process.env.OTP_DEBUG_MODE === "true"
          ? otp
          : undefined,
      message:
        otpChannel === "email"
          ? "OTP sent to your email address."
          : "OTP sent to your mobile number.",
      userId: user._id,
    });
  } catch (error) {
    console.error("Send OTP error:", error);
    return res.status(500).json({ message: "Unable to send OTP right now." });
  }
};

// =======================================================
// 4. VERIFY OTP
// =======================================================
export const verifyLoginOtp = async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: "Email and OTP are required." });
  }

  try {
    const user = await users.findOne({ email });

    if (!user || !user.otpCodeHash || !user.otpExpiresAt) {
      return res.status(404).json({ message: "No OTP request found for this user." });
    }

    if (user.otpExpiresAt.getTime() < Date.now()) {
      return res.status(400).json({ message: "OTP expired. Please request a new one." });
    }

    if (hashOtp(otp) !== user.otpCodeHash) {
      return res.status(400).json({ message: "Invalid OTP." });
    }

    user.otpCodeHash = undefined;
    user.otpExpiresAt = undefined;
    user.otpVerifiedAt = new Date();
    await user.save();

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: "JWT_SECRET is missing from the server environment." });
    }
    return res.status(200).json({ result: user, token: createToken(user._id) });
  } catch (error) {
    console.error("Verify OTP error:", error);
    return res.status(500).json({ message: "Unable to verify OTP right now." });
  }
};

// =======================================================
// 5. PROFILE UPDATES
// =======================================================
export const updateprofile = async (req, res) => {
  const { id: _id } = req.params;
  const { channelname, city, description, mobileNumber, state } = req.body;
  
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(500).json({ message: "User unavailable..." });
  }
  
  try {
    const updatedata = await users.findByIdAndUpdate(
      _id,
      {
        $set: {
          channelname: channelname,
          city: city,
          description: description,
          mobileNumber: mobileNumber,
          state: state,
        },
      },
      { new: true }
    );
    return res.status(201).json(updatedata);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// =======================================================
// 6. GET PROFILE
// =======================================================
export const getprofile = async (req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "User unavailable..." });
  }

  try {
    const profile = await users.findById(id);

    if (!profile) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.status(200).json(profile);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};