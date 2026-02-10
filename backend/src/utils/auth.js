const crypto = require("crypto");

function base64UrlEncode(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = base64.length % 4 === 0 ? "" : "=".repeat(4 - (base64.length % 4));
  return Buffer.from(`${base64}${padding}`, "base64").toString("utf8");
}

function getSecret() {
  return process.env.JWT_SECRET || "dev-only-secret";
}

function signToken(user) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    uid: user._id.toString(),
    role: user.role,
    username: user.username,
    exp: now + 7 * 24 * 60 * 60,
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = crypto
    .createHmac("sha256", getSecret())
    .update(encodedPayload)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${encodedPayload}.${signature}`;
}

function verifyToken(token) {
  const [encodedPayload, signature] = String(token || "").split(".");
  if (!encodedPayload || !signature) throw new Error("Malformed token");

  const expected = crypto
    .createHmac("sha256", getSecret())
    .update(encodedPayload)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    throw new Error("Invalid signature");
  }

  const decoded = JSON.parse(base64UrlDecode(encodedPayload));
  if (!decoded.exp || decoded.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Token expired");
  }

  return decoded;
}

function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ ok: false, message: "No token" });

    req.user = verifyToken(token);
    next();
  } catch (_error) {
    return res.status(401).json({ ok: false, message: "Invalid token" });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user?.role) return res.status(401).json({ ok: false, message: "No user role" });
    if (!roles.includes(req.user.role)) return res.status(403).json({ ok: false, message: "Forbidden" });
    next();
  };
}

module.exports = { signToken, requireAuth, requireRole };