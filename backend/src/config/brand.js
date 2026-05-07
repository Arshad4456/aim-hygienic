function firstNonEmpty(...values) {
  for (const value of values) if (String(value || "").trim()) return String(value).trim();
  return "";
}
const APP_BRAND = {
  name: firstNonEmpty(process.env.APP_NAME, process.env.NEXT_PUBLIC_APP_NAME, "Enterprise ERP Suite"),
  shortName: firstNonEmpty(process.env.APP_SHORT_NAME, process.env.NEXT_PUBLIC_APP_SHORT_NAME, "ERP Suite"),
  serviceName: firstNonEmpty(process.env.APP_SERVICE_NAME, "erp-saas-api"),
  domain: firstNonEmpty(process.env.APP_DOMAIN, process.env.NEXT_PUBLIC_APP_DOMAIN, "yourdomain.com"),
  publicFileBaseUrl: firstNonEmpty(process.env.CLOUDFLARE_R2_PUBLIC_BASE_URL, process.env.R2_PUBLIC_BASE_URL, process.env.PUBLIC_FILE_BASE_URL, "https://files.yourdomain.com").replace(/\/$/, ""),
};
module.exports = { APP_BRAND, firstNonEmpty };
