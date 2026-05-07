const { firstNonEmpty } = require("./brand");
const PLACEHOLDER_DOMAINS = ["your" + "domain.com"];
function splitOrigins(value = "") { return String(value || "").split(",").map((origin) => origin.trim()).filter(Boolean); }
function getAllowedOrigins() {
  const configured = splitOrigins(firstNonEmpty(process.env.CORS_ORIGIN, process.env.ALLOWED_ORIGINS));
  const frontendUrl = firstNonEmpty(process.env.FRONTEND_URL, process.env.NEXT_PUBLIC_WEBSITE_URL);
  const appDomain = firstNonEmpty(process.env.APP_DOMAIN, process.env.NEXT_PUBLIC_APP_DOMAIN);
  const defaults = ["http://localhost:3000", "http://127.0.0.1:3000"];
  if (frontendUrl) defaults.push(frontendUrl.replace(/\/$/, ""));
  if (appDomain && !PLACEHOLDER_DOMAINS.includes(appDomain)) {
    defaults.push(`https://${appDomain}`);
    defaults.push(`https://www.${appDomain.replace(/^www\./, "")}`);
  }
  return [...new Set([...defaults, ...configured])];
}
function buildCorsOptions() {
  const allowedOrigins = getAllowedOrigins();
  return {
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  };
}
module.exports = { getAllowedOrigins, buildCorsOptions };
