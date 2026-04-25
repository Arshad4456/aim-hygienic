const defaultAllowedOrigins = ["https://aimhygienics.com", "https://www.aimhygienics.com", "http://localhost:3000"];
function getAllowedOrigins() {
  const envAllowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",").map((value) => value.trim()).filter(Boolean) : [];
  return [...new Set([...defaultAllowedOrigins, ...envAllowedOrigins])];
}
function buildCorsOptions() {
  const allowedOrigins = getAllowedOrigins();
  return { origin(origin, callback) { if (!origin || allowedOrigins.includes(origin)) return callback(null, true); return callback(new Error("Not allowed by CORS")); }, credentials: true };
}
module.exports = { getAllowedOrigins, buildCorsOptions };
