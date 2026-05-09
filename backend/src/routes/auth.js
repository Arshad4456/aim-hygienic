const express = require("express");
const User = require("../models/User");
const Company = require("../models/Company");
const Warehouse = require("../models/Warehouse");
const CompanyBranch = require("../models/CompanyBranch");
const { signToken, requireAuth, inferPortalType } = require("../utils/auth");
const { verifyPassword } = require("../utils/passwordHash");
const { listAllTenantTargets, getTenantModel } = require("../utils/tenantModels");
const { listTenantUsersByCompany } = require("../utils/tenantUsers");
const { getUserPermissionProfile, listVisibleModules } = require("../core/permissions/permission.service");
const { ensureDefaultModules } = require("../core/portal-modules/portalModule.service");

const router = express.Router();

function buildIdentifierCandidates(rawIdentifier) {
  const value = String(rawIdentifier || "").trim();
  if (!value) return [];
  const candidates = new Set([value, value.toLowerCase()]);
  const digits = value.replace(/\D/g, "");
  if (digits) {
    candidates.add(digits);
    if (digits.startsWith("92") && digits.length > 2) {
      const localWithoutCountry = digits.slice(2);
      candidates.add(localWithoutCountry);
      if (!localWithoutCountry.startsWith("0")) candidates.add(`0${localWithoutCountry}`);
    }
    if (digits.startsWith("0") && digits.length > 1) candidates.add(digits.slice(1));
  }
  return Array.from(candidates).filter(Boolean);
}

function buildLoosePhoneRegex(rawIdentifier) {
  const digits = String(rawIdentifier || "").replace(/\D/g, "");
  if (!digits) return null;
  let local = digits;
  if (local.startsWith("92") && local.length > 2) local = local.slice(2);
  if (local.startsWith("0") && local.length > 1) local = local.slice(1);
  if (!local) return null;
  return new RegExp(`${local.slice(-10)}$`);
}

function isUserActive(status) {
  const normalized = String(status || "active").toLowerCase().trim();
  return !normalized || normalized === "active";
}

async function findUserInTenants(buildQuery) {
  const targets = await listAllTenantTargets();
  for (const target of targets) {
    const TenantUser = await getTenantModel(User, target.companyId, target.companyName);
    if (!TenantUser) continue;
    const user = await TenantUser.findOne(buildQuery()).lean();
    if (user) return user;
  }
  return null;
}

async function findUserByTokenPayload(payload = {}) {
  const id = String(payload.uid || payload._id || "").trim();
  const userId = String(payload.userId || "").trim();
  const username = String(payload.username || "").trim();
  const mobile = String(payload.mobile || payload.mobileNumber || "").trim();
  const queries = [];
  if (id) queries.push(() => ({ _id: id }));
  if (userId) queries.push(() => ({ userId }));
  if (username) queries.push(() => ({ username: username.toLowerCase() }));
  if (mobile) queries.push(() => ({ $or: [{ mobile }, { mobileNumber: mobile }, { phoneNumber: mobile }] }));
  for (const buildQuery of queries) {
    const root = await User.findOne(buildQuery()).lean().catch(() => null);
    if (root) return root;
    const tenant = await findUserInTenants(buildQuery).catch(() => null);
    if (tenant) return tenant;
  }
  return null;
}

function publicUser(user, profile = {}) {
  return {
    id: user._id || user.uid,
    userId: user.userId || "",
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    roleId: profile.roleId || user.roleId || null,
    roleName: profile.roleName || user.role || "User",
    roleKey: profile.roleKey || user.roleKey || String(user.role || "").toLowerCase(),
    portalType: profile.portalType || user.portalType || inferPortalType(user.role),
    landingPath: profile.landingPath || user.landingPath || "/portals",
    companyId: user.companyId || "",
    companyName: user.companyName || "",
    erpTemplateKey: user.erpTemplateKey || user.businessType || "distribution_erp",
    distributorId: String(user?.role || "").trim().toLowerCase() === "distributor" ? user.distributorId || user.userId || user._id || "" : user.distributorId || "",
    distributorName: user.distributorName || "",
    regionId: user.regionId || "",
    regionName: user.regionName || "",
    zoneId: user.zoneId || "",
    zoneName: user.zoneName || "",
    territoryId: user.territoryId || "",
    territoryName: user.territoryName || "",
    fieldId: user.fieldId || "",
    fieldName: user.fieldName || "",
    mobile: user.mobile || user.mobileNumber,
    email: user.email,
    language: user.language || "en",
    theme: user.theme || "light",
    warehouseId: user.warehouseId || "",
    permissions: profile.permissions || {},
    enabledModules: profile.enabledModules || [],
    subscription: profile.subscription || user.subscription || null,
    companyStatus: profile.companyStatus || user.companyStatus || "",
    companyUsage: profile.companyUsage || user.companyUsage || {},
    mobileAccess: profile.mobileAccess || false,
    mobileModules: profile.mobileModules || [],
  };
}

async function loadCompanyContext(user = {}) {
  const companyId = String(user.companyId || "").trim();
  if (!companyId) return {};
  const company = await Company.findOne({ companyId }).lean().catch(() => null);
  const tenantUsers = await listTenantUsersByCompany(companyId).catch(() => []);
  const [branches, warehouses] = await Promise.all([
    CompanyBranch.countDocuments({ companyId }).catch(() => 0),
    Warehouse.countDocuments({ companyId }).catch(() => 0),
  ]);
  return {
    subscription: company?.subscription || user.subscription || null,
    companyStatus: company?.status || user.companyStatus || "",
    enabledModules: company?.enabledModules?.length ? company.enabledModules : user.enabledModules || [],
    erpTemplateKey: company?.erpTemplateKey || company?.businessType || user.erpTemplateKey || user.businessType || "distribution_erp",
    companyUsage: { users: tenantUsers.length, activeUsers: tenantUsers.filter((u) => String(u.status || "active").toLowerCase() === "active").length, mobileUsers: tenantUsers.filter((u) => Boolean(u.mobileAccess)).length, branches, warehouses },
  };
}

async function enrichUser(user) {
  await ensureDefaultModules().catch(() => null);
  try {
    const companyContext = await loadCompanyContext(user);
    const profile = { ...(await getUserPermissionProfile({ ...user, ...companyContext })), ...companyContext };
    const visibleModules = await listVisibleModules({ ...user, ...profile }).catch(() => []);
    return { profile, visibleModules };
  } catch (error) {
    const fallbackProfile = {
      roleName: user?.role || "User",
      roleKey: String(user?.role || "user").toLowerCase(),
      portalType: user?.portalType || inferPortalType(user?.role),
      permissions: { dashboard: { actions: ["view"], scope: "own" } },
      enabledModules: ["dashboard"],
      mobileAccess: Boolean(user?.mobileAccess),
      mobileModules: user?.mobileModules || [],
      landingPath: user?.landingPath || "/portals",
    };
    return { profile: fallbackProfile, visibleModules: [] };
  }
}

router.post("/login", async (req, res) => {
  try {
    const { mobile, password, username } = req.body || {};
    const identifier = mobile || username;
    if (!identifier || !password) return res.status(400).json({ ok: false, message: "Missing credentials" });
    const identifiers = buildIdentifierCandidates(identifier);
    const directQuery = () => ({ $or: [{ mobile: { $in: identifiers } }, { mobileNumber: { $in: identifiers } }, { username: { $in: identifiers } }, { username: { $in: identifiers.map((v) => v.toLowerCase()) } }, { phoneNumber: { $in: identifiers } }] });
    let user = await User.findOne(directQuery()).lean();
    if (!user) user = await findUserInTenants(directQuery);
    if (!user) {
      const loose = buildLoosePhoneRegex(identifier);
      if (loose) {
        const regexQuery = () => ({ $or: [{ mobile: { $regex: loose } }, { mobileNumber: { $regex: loose } }, { phoneNumber: { $regex: loose } }] });
        user = await User.findOne(regexQuery()).lean();
        if (!user) user = await findUserInTenants(regexQuery);
      }
    }
    if (!user) return res.status(401).json({ ok: false, message: "Invalid username/password" });
    if (!isUserActive(user.status)) return res.status(403).json({ ok: false, message: "User is deactive" });
    if (!(await verifyPassword(password, user.passwordHash || user.password))) return res.status(401).json({ ok: false, message: "Invalid username/password" });
    const { profile, visibleModules } = await enrichUser(user);
    const token = signToken({ ...user, ...profile });
    return res.json({ ok: true, token, user: publicUser(user, profile), visibleModules });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Login failed" });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  try {
    let user = await findUserByTokenPayload(req.user).catch(() => null);
    if (!user) user = req.user;
    const { profile, visibleModules } = await enrichUser(user);
    return res.json({ ok: true, user: publicUser(user, profile), visibleModules });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Unable to load profile" });
  }
});

module.exports = router;
