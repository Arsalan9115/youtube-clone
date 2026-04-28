import mongoose from "mongoose";

const paymentSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    razorpayOrderId: {
      type: String,
      required: true,
    },
    razorpayPaymentId: {
      type: String,
    },
    razorpaySignature: {
      type: String,
    },
    amount: {
      type: Number,
      required: true,
    },
    invoiceNumber: {
      type: String,
    },
    planCode: {
      type: String,
      enum: ["free", "bronze", "silver", "gold"],
      default: "gold",
    },
    currency: {
      type: String,
      default: "INR",
    },
    status: {
      type: String,
      enum: ["created", "paid", "failed"],
      default: "created",
    },
    planName: {
      type: String,
      default: "YourTube Premium",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("payment", paymentSchema);
