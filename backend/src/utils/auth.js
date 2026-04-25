const crypto = require("crypto");
function base64UrlEncode(value) { return Buffer.from(value).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_"); }
function base64UrlDecode(value) { const b = value.replace(/-/g, "+").replace(/_/g, "/"); const p = b.length % 4 === 0 ? "" : "=".repeat(4 - (b.length % 4)); return Buffer.from(`${b}${p}`, "base64").toString("utf8"); }
function getSecret() { return process.env.JWT_SECRET || "dev-only-secret"; }
function asText(v) { return String(v || "").trim(); }
function normalizeRole(role) { return String(role || "").trim().toLowerCase(); }
function inferPortalType(role) { const r = normalizeRole(role); if (["admin", "system admin", "super admin"].includes(r)) return "system_admin"; if (r === "company admin") return "company_admin"; return r.replace(/\s+/g, "_") || "company_user"; }
function signToken(user) {
  const now = Math.floor(Date.now() / 1000);
  const normalizedRole = normalizeRole(user?.role);
  const distributorId = normalizedRole === "distributor" ? asText(user?.distributorId || user?.userId || user?._id) : asText(user?.distributorId);
  const payload = {
    uid: asText(user?._id), role: user?.role, roleId: asText(user?.roleId), roleKey: asText(user?.roleKey || user?.role).toLowerCase(), portalType: asText(user?.portalType || inferPortalType(user?.role)), landingPath: asText(user?.landingPath || "/portals"), username: user?.username,
    warehouse_id: asText(user?.warehouseId), warehouseId: asText(user?.warehouseId), userId: asText(user?.userId), distributorId, distributorName: asText(user?.distributorName), companyId: asText(user?.companyId), companyName: asText(user?.companyName), erpTemplateKey: asText(user?.erpTemplateKey || user?.businessType || "distribution_erp"),
    regionId: asText(user?.regionId), regionName: asText(user?.regionName), zoneId: asText(user?.zoneId), zoneName: asText(user?.zoneName), territoryId: asText(user?.territoryId), territoryName: asText(user?.territoryName), fieldId: asText(user?.fieldId), fieldName: asText(user?.fieldName), exp: now + 7 * 24 * 60 * 60,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = crypto.createHmac("sha256", getSecret()).update(encodedPayload).digest("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${encodedPayload}.${signature}`;
}
function verifyToken(token) { const [encodedPayload, signature] = String(token || "").split("."); if (!encodedPayload || !signature) throw new Error("Malformed token"); const expected = crypto.createHmac("sha256", getSecret()).update(encodedPayload).digest("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_"); if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new Error("Invalid signature"); const decoded = JSON.parse(base64UrlDecode(encodedPayload)); if (!decoded.exp || decoded.exp < Math.floor(Date.now() / 1000)) throw new Error("Token expired"); return decoded; }
function requireAuth(req, res, next) { try { const header = req.headers.authorization || ""; const token = header.startsWith("Bearer ") ? header.slice(7) : null; if (!token) return res.status(401).json({ ok: false, message: "No token" }); req.user = verifyToken(token); next(); } catch (_e) { return res.status(401).json({ ok: false, message: "Invalid token" }); } }
function requireRole(...roles) { return (req, res, next) => { if (!req.user?.role) return res.status(401).json({ ok: false, message: "No user role" }); const allowed = roles.map(normalizeRole); const aliases = { admin: ["admin", "system admin", "company admin", "super admin"] }; const expanded = new Set(allowed); for (const r of allowed) for (const a of aliases[r] || []) expanded.add(a); if (!expanded.has(normalizeRole(req.user.role))) return res.status(403).json({ ok: false, message: "Forbidden" }); next(); }; }
module.exports = { signToken, verifyToken, requireAuth, requireRole, normalizeRole, inferPortalType };
