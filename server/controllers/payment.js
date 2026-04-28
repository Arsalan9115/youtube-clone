import crypto from "crypto";

import mongoose from "mongoose";
import Razorpay from "razorpay";

import payments from "../Modals/payment.js";
import users from "../Modals/Auth.js";
import { getPlanByCode } from "../config/plans.js";
import { sendPlanInvoiceEmail } from "../services/email.js";

const canUseDevelopmentCheckout = () =>
  process.env.NODE_ENV !== "production" &&
  process.env.DISABLE_DEV_CHECKOUT_FALLBACK !== "true";

const getRazorpayInstance = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return null;
  }

  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

const buildInvoiceNumber = () => `YT-${Date.now()}`;

export const createPlanOrder = async (req, res) => {
  const { planCode = "gold", userId } = req.body;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user id." });
  }

  const razorpay = getRazorpayInstance();

  try {
    const user = await users.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const selectedPlan = getPlanByCode(planCode);
    if (selectedPlan.amount <= 0) {
      return res.status(400).json({ message: "Choose a paid plan to upgrade." });
    }

    if (!razorpay && !canUseDevelopmentCheckout()) {
      return res.status(503).json({
        message:
          "Razorpay is not configured yet. Add test keys in the server environment to enable premium checkout.",
      });
    }

    const order = razorpay
      ? await razorpay.orders.create({
          amount: selectedPlan.amount,
          currency: selectedPlan.currency,
          receipt: `${planCode}_${userId}_${Date.now()}`,
          notes: {
            plan: selectedPlan.displayName,
            planCode,
            userId: String(userId),
          },
        })
      : {
          amount: selectedPlan.amount,
          currency: selectedPlan.currency,
          id: `dev_order_${Date.now()}`,
          notes: {
            plan: selectedPlan.displayName,
            planCode,
            userId: String(userId),
          },
          receipt: `${planCode}_${userId}_${Date.now()}`,
        };

    await payments.create({
      amount: selectedPlan.amount,
      currency: selectedPlan.currency,
      invoiceNumber: buildInvoiceNumber(),
      planCode,
      planName: selectedPlan.displayName,
      razorpayOrderId: order.id,
      status: "created",
      userId,
    });

    return res.status(201).json({
      order,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      checkoutMode: razorpay ? "razorpay" : "development",
      amount: selectedPlan.amount,
      currency: selectedPlan.currency,
      planCode,
      planName: selectedPlan.displayName,
      watchLimitLabel: selectedPlan.watchLimitLabel,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Unable to create payment order." });
  }
};

export const verifyPlanPayment = async (req, res) => {
  const { userId, razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    req.body;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user id." });
  }

  if (!razorpay_order_id || !razorpay_payment_id) {
    return res.status(400).json({ message: "Incomplete payment details." });
  }

  try {
    const paymentRecord = await payments.findOne({
      razorpayOrderId: razorpay_order_id,
    });

    if (!paymentRecord) {
      return res.status(404).json({ message: "Payment order not found." });
    }

    const selectedPlan = getPlanByCode(paymentRecord.planCode);
    const isDevelopmentOrder = razorpay_order_id.startsWith("dev_order_");
    const generatedSignature =
      !isDevelopmentOrder && process.env.RAZORPAY_KEY_SECRET
        ? crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest("hex")
        : null;

    const signatureIsValid = isDevelopmentOrder
      ? canUseDevelopmentCheckout()
      : Boolean(razorpay_signature && generatedSignature === razorpay_signature);

    if (!signatureIsValid) {
      await payments.findOneAndUpdate(
        { razorpayOrderId: razorpay_order_id },
        {
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature || "missing-signature",
          status: "failed",
        }
      );

      return res.status(400).json({ message: "Payment signature mismatch." });
    }

    const user = await users.findByIdAndUpdate(
      userId,
      {
        $set: {
          currentPlan: paymentRecord.planCode,
          isPremium: selectedPlan.isPremium,
          premiumSince: new Date(),
          watchLimitSeconds: selectedPlan.watchLimitSeconds,
        },
      },
      { new: true }
    );

    const updatedPayment = await payments.findOneAndUpdate(
      { razorpayOrderId: razorpay_order_id },
      {
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature || "development-signature",
        status: "paid",
      },
      { new: true }
    );

    const emailResult = await sendPlanInvoiceEmail({
      amount: updatedPayment.amount,
      currency: updatedPayment.currency,
      email: user?.email,
      invoiceNumber: updatedPayment.invoiceNumber,
      name: user?.name,
      paymentId: razorpay_payment_id,
      planName: updatedPayment.planName,
      watchLimitLabel: selectedPlan.watchLimitLabel,
    }).catch((error) => {
      console.error("invoice email error:", error);
      return { delivered: false, skipped: false };
    });

    return res.status(200).json({
      emailDelivered: emailResult.delivered,
      message: `${selectedPlan.displayName} plan activated successfully.`,
      user,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Payment verification failed." });
  }
};
