function firstNonEmpty(...values) {
  for (const value of values) if (String(value || "").trim()) return String(value).trim();
  return "";
}
const APP_BRAND = {
  name: firstNonEmpty(process.env.APP_NAME, process.env.NEXT_PUBLIC_APP_NAME, "Rawyan ERP"),
  shortName: firstNonEmpty(process.env.APP_SHORT_NAME, process.env.NEXT_PUBLIC_APP_SHORT_NAME, "Rawyan"),
  serviceName: firstNonEmpty(process.env.APP_SERVICE_NAME, "rawyan-erp-api"),
  domain: firstNonEmpty(process.env.APP_DOMAIN, process.env.NEXT_PUBLIC_APP_DOMAIN, "rawyanerp.com"),
  supportEmail: firstNonEmpty(process.env.SUPPORT_EMAIL, process.env.NEXT_PUBLIC_SUPPORT_EMAIL, "mdarshadkhan344@gmail.com"),
  salesEmail: firstNonEmpty(process.env.SALES_EMAIL, process.env.NEXT_PUBLIC_SALES_EMAIL, "mdarshadkhan344@gmail.com"),
  whatsappNumber: firstNonEmpty(process.env.WHATSAPP_NUMBER, process.env.NEXT_PUBLIC_WHATSAPP_NUMBER, "+923339933057"),
  publicFileBaseUrl: firstNonEmpty(process.env.CLOUDFLARE_R2_PUBLIC_BASE_URL, process.env.R2_PUBLIC_BASE_URL, process.env.PUBLIC_FILE_BASE_URL, "https://files.rawyanerp.com").replace(/\/$/, ""),
};
module.exports = { APP_BRAND, firstNonEmpty };
