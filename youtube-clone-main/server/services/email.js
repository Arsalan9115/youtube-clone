import nodemailer from "nodemailer";

const isDevelopmentFallbackEnabled = () =>
  process.env.NODE_ENV !== "production" &&
  process.env.DISABLE_DEV_DELIVERY_FALLBACK !== "true";

const getTransporter = () => {
  const gmailUser = process.env.GMAIL_USER || process.env.SMTP_USER;
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS;

  if (gmailUser && gmailAppPassword) {
    return nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: gmailUser,
        pass: gmailAppPassword,
      },
      tls: {
        rejectUnauthorized: false,
      },
      connectionTimeout: 10000,
    });
  }

  if (
    !process.env.SMTP_HOST ||
    !process.env.SMTP_PORT ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASS
  ) {
    return null;
  }

  const port = Number(process.env.SMTP_PORT);

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
    connectionTimeout: 10000,
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
  try {
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
      from: process.env.SMTP_FROM || process.env.GMAIL_USER || process.env.SMTP_USER,
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
  } catch (error) {
    console.error("Email send failed, falling back gracefully:", error);
    return { delivered: false, skipped: true, simulated: true };
  }
};

export const sendOtpEmail = async ({ email, name, otp, state }) => {
  try {
    const transporter = getTransporter();

    if (!transporter || !email) {
      if (email && isDevelopmentFallbackEnabled()) {
        return createDevelopmentDelivery("email-otp", { email, otp, state });
      }

      return { delivered: false, skipped: true };
    }

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.GMAIL_USER || process.env.SMTP_USER,
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
  } catch (error) {
    console.error("Email send failed, falling back gracefully:", error);
    // Crash hone ke bajaye simulated fallback de dega taaki OTP mil jaye
    return { delivered: false, skipped: true, simulated: true };
  }
};