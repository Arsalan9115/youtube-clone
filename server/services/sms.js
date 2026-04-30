const canSendSms = () =>
  Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_PHONE_NUMBER
  );

const canUseDevelopmentFallback = () =>
  process.env.NODE_ENV !== "production" &&
  process.env.DISABLE_DEV_DELIVERY_FALLBACK !== "true";

export const sendOtpSms = async ({ mobileNumber, otp }) => {
  if (!canSendSms()) {
    if (mobileNumber && canUseDevelopmentFallback()) {
      const preview = `OTP ${otp} for ${mobileNumber}`;
      console.log(`[dev-sms] ${preview}`);
      return { delivered: true, preview, skipped: false, simulated: true };
    }

    return { delivered: false, skipped: true };
  }

  const body = new URLSearchParams({
    Body: `YourTube OTP: ${otp}. It expires in 10 minutes.`,
    From: process.env.TWILIO_FROM_NUMBER,
    To: mobileNumber,
  });

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      body,
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
        ).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`SMS delivery failed: ${errorText}`);
  }

  return { delivered: true, skipped: false };
};
