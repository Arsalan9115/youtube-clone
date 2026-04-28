import nodemailer from "nodemailer";

const isDevelopmentFallbackEnabled = () =>
  process.env.NODE_ENV !== "production" &&
  process.env.DISABLE_DEV_DELIVERY_FALLBACK !== "true";

const getTransporter = () => {
  if (
    !process.env.SMTP_HOST ||
    !process.env.SMTP_PORT ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASS
  ) {
    return null;
  }

  return nodemailer.createTransport({
    auth: {
      pass: process.env.SMTP_PASS,
      user: process.env.SMTP_USER,
    },
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465,
  });
};

const createDevelopmentDelivery = (channel, payload) => {
  const preview =
    channel === "invoice"
      ? `Invoice ${payload.invoiceNumber} for ${payload.planName} (${payload.watchLimitLabel})`
      : `OTP ${payload.otp} for ${payload.email || payload.mobileNumber}`;

  console.log(`[dev-${channel}] ${preview}`);
  return {
    delivered: true,
    preview,
    skipped: false,
    simulated: true,
  };
};

export const sendPlanInvoiceEmail = async ({
  amount,
  currency,
  email,
  invoiceNumber,
  name,
  paymentId,
  planName,
  watchLimitLabel,
}) => {
  const transporter = getTransporter();

  if (!transporter || !email) {
    if (email && isDevelopmentFallbackEnabled()) {
      return createDevelopmentDelivery("invoice", {
        email,
        invoiceNumber,
        planName,
        watchLimitLabel,
      });
    }

    return { delivered: false, skipped: true };
  }

  const formattedAmount = `${currency} ${(amount / 100).toFixed(2)}`;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
        <h2 style="margin-bottom: 8px;">YourTube Plan Upgrade Confirmation</h2>
        <p>Hi ${name || "User"},</p>
        <p>Your payment was successful and your plan is now active.</p>
        <div style="margin: 20px 0; padding: 16px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <p><strong>Invoice Number:</strong> ${invoiceNumber}</p>
          <p><strong>Plan:</strong> ${planName}</p>
          <p><strong>Watch Access:</strong> ${watchLimitLabel}</p>
          <p><strong>Amount Paid:</strong> ${formattedAmount}</p>
          <p><strong>Payment ID:</strong> ${paymentId}</p>
        </div>
        <p>Thank you for upgrading your YourTube experience.</p>
      </div>
    `,
    subject: `YourTube Invoice - ${planName} Plan`,
    text: `Invoice ${invoiceNumber}\nPlan: ${planName}\nWatch Access: ${watchLimitLabel}\nAmount Paid: ${formattedAmount}\nPayment ID: ${paymentId}`,
    to: email,
  });

  return { delivered: true, skipped: false };
};

export const sendOtpEmail = async ({ email, name, otp, state }) => {
  const transporter = getTransporter();

  if (!transporter || !email) {
    if (email && isDevelopmentFallbackEnabled()) {
      return createDevelopmentDelivery("email-otp", { email, otp, state });
    }

    return { delivered: false, skipped: true };
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
        <h2>YourTube OTP Verification</h2>
        <p>Hi ${name || "User"},</p>
        <p>You are signing in from ${state}. Because this region uses email verification, use the OTP below:</p>
        <div style="margin: 20px 0; font-size: 28px; font-weight: 700; letter-spacing: 8px;">${otp}</div>
        <p>This OTP expires in 10 minutes.</p>
      </div>
    `,
    subject: "YourTube Login OTP",
    text: `Hi ${name || "User"}, your YourTube login OTP is ${otp}. It expires in 10 minutes.`,
    to: email,
  });

  return { delivered: true, skipped: false };
};
