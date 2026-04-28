const { CHANNELS } = require("./notifications.constants");

function hasAnyEnv(keys = []) {
  return keys.some((key) => String(process.env[key] || "").trim());
}

function providerName(channel) {
  if (channel === "push") return "firebase_or_expo";
  if (channel === "sms") return "sms_gateway";
  if (channel === "whatsapp") return "whatsapp_business";
  if (channel === "email") return "smtp_or_email_provider";
  return "rawyan_in_app";
}

function isProviderConfigured(channel) {
  if (channel === "in_app") return true;
  if (channel === "push") return hasAnyEnv(["FCM_SERVER_KEY", "FIREBASE_PROJECT_ID", "EXPO_ACCESS_TOKEN"]);
  if (channel === "sms") return hasAnyEnv(["SMS_PROVIDER_URL", "SMS_API_KEY", "SMS_USERNAME"]);
  if (channel === "whatsapp") return hasAnyEnv(["WHATSAPP_API_URL", "WHATSAPP_ACCESS_TOKEN", "WHATSAPP_PHONE_NUMBER_ID"]);
  if (channel === "email") return hasAnyEnv(["SMTP_HOST", "EMAIL_PROVIDER_API_KEY", "MAILGUN_API_KEY", "SENDGRID_API_KEY"]);
  return false;
}

async function deliverChannel(channel, notification = {}) {
  const safeChannel = CHANNELS.includes(channel) ? channel : "in_app";
  const provider = providerName(safeChannel);

  if (safeChannel === "in_app") {
    return { channel: safeChannel, provider, status: "sent", sentAt: new Date() };
  }

  if (!isProviderConfigured(safeChannel)) {
    return {
      channel: safeChannel,
      provider,
      status: "provider_not_configured",
      error: `${provider} credentials are not configured. Notification is saved for in-app/mobile review.`,
    };
  }

  return {
    channel: safeChannel,
    provider,
    status: "queued",
    providerMessageId: `${safeChannel}_${Date.now()}_${String(notification._id || "draft").slice(-6)}`,
    sentAt: new Date(),
  };
}

module.exports = { deliverChannel, isProviderConfigured, providerName };
