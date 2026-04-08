const express = require("express");
const User = require("../models/User");
const { requireAuth, requireRole } = require("../utils/auth");
const { validatePassword } = require("../utils/password");
const { hashPassword, verifyPassword } = require("../utils/passwordHash");
const { createUserInTenant, updateUserInTenant, deleteUserFromTenant, listTenantUsersByCompany, findTenantUserById } = require("../utils/tenantUsers");
const { listAllTenantTargets, getTenantModel } = require("../utils/tenantModels");
const { createModuleAccessGuard } = require("../utils/moduleAccess");

const router = express.Router();

const COMMON_PROFILE_FIELDS = ["email", "address", "cnicNo", "mobileNumber", "phoneNumber", "companyId", "companyName", "documentPdf", "documentPdfName", "documentPdfUrl", "documentPdfObjectKey"];
const ROLE_PROFILE_FIELDS = {
  admin: [],
  CEO: [],
  "Managing Director": [],
  "Warehouse Manager": ["warehouseId", "warehouseName"],
  "Account Officer": ["warehouseId", "warehouseName"],
  "HR Assistant": ["warehouseId", "warehouseName"],
  Cashier: ["warehouseId", "warehouseName"],
  KPO: ["warehouseId", "warehouseName"],
  "National Sale Manager": [],
  "Regional Sale Manager": ["warehouseId", "warehouseName", "regionId", "regionName"],
  "Zone Sale Manager": ["warehouseId", "warehouseName", "regionId", "regionName", "zoneId", "zoneName"],
  "Territory Sale Manager": [
    "warehouseId",
    "warehouseName",
    "regionId",
    "regionName",
    "zoneId",
    "zoneName",
    "territoryId",
    "territoryName",
  ],
  Distributor: ["warehouseId", "warehouseName", "regionId", "regionName", "zoneId", "zoneName", "territoryId", "territoryName"],
  "Field Sale Manager": [
    "warehouseId",
    "warehouseName",
    "regionId",
    "regionName",
    "zoneId",
    "zoneName",
    "territoryId",
    "territoryName",
    "fieldId",
    "fieldName",
  ],
  "Order Booker": [
    "warehouseId",
    "warehouseName",
    "regionId",
    "regionName",
    "zoneId",
    "zoneName",
    "territoryId",
    "territoryName",
    "fieldId",
    "fieldName",
  ],
  Salesman: [
    "warehouseId",
    "warehouseName",
    "regionId",
    "regionName",
    "zoneId",
    "zoneName",
    "territoryId",
    "territoryName",
    "fieldId",
    "fieldName",
  ],
  "Delivery Boy": [
    "warehouseId",
    "warehouseName",
    "regionId",
    "regionName",
    "zoneId",
    "zoneName",
    "territoryId",
    "territoryName",
    "fieldId",
    "fieldName",
  ],
  Supplier: ["warehouseId", "warehouseName"],
  Vendor: ["businessName", "warehouseId", "warehouseName"],
  customer: [
    "businessType",
    "businessName",
    "warehouseId",
    "warehouseName",
    "regionId",
    "regionName",
    "zoneId",
    "zoneName",
    "territoryId",
    "territoryName",
    "fieldId",
    "fieldName",
  ],
  "Brand Manager": [
    "businessType",
    "businessName",
    "warehouseId",
    "warehouseName",
    "regionId",
    "regionName",
    "zoneId",
    "zoneName",
    "territoryId",
    "territoryName",
    "fieldId",
    "fieldName",
  ],
};

const OPTIONAL_PROFILE_FIELDS = [
  "email",
  "companyId",
  "companyName",
  "companyBranchId",
  "branchId",
  "branchNameOrNumber",
  "warehouseId",
  "warehouseName",
  "regionId",
  "regionName",
  "zoneId",
  "zoneName",
  "areaId",
  "areaName",
  "shopId",
  "shopName",
  "address",
  "shopAddress",
  "cnicNo",
  "mobileNumber",
  "phoneNumber",
  "gpsLatitude",
  "gpsLongitude",
  "managerId",
  "managerName",
  "warehouseManagerId",
  "warehouseManagerName",
  "accountantId",
  "accountantName",
  "distributorId",
  "distributorName",
  "driverId",
  "driverName",
  "deliveryBoyId",
  "deliveryBoyName",
  "salesmanId",
  "salesmanName",
  "orderBookerId",
  "orderBookerName",
  "customerId",
  "customerName",
  "supplierId",
  "supplierName",
  "supplierWarehouseId1",
  "supplierWarehouseName1",
  "supplierWarehouseId2",
  "supplierWarehouseName2",
  "territoryId",
  "territoryName",
  "fieldId",
  "fieldName",
  "businessType",
  "businessName",
  "documentPdf",
  "documentPdfName",
  "documentPdfUrl",
  "documentPdfObjectKey",
];

function normalize(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeRole(role) {
  return String(role || "").trim().toLowerCase();
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\$&");
}

function isCompanyAdmin(role) {
  return normalizeRole(role) === "company admin";
}

function isSystemLevelAdmin(role) {
  const normalized = normalizeRole(role);
  return normalized === "admin" || normalized === "system admin";
}
const COMPANY_ADMIN_BLOCKED_CREATE_ROLES = new Set(["admin", "system admin", "company admin"]);

function isDistributor(role) {
  return normalizeRole(role) === "distributor";
}

const DISTRIBUTOR_MANAGEABLE_ROLES = new Set(["salesman", "order booker", "orderbooker", "customer"]);

function isDistributorManageableRole(role) {
  return DISTRIBUTOR_MANAGEABLE_ROLES.has(normalizeRole(role));
}

function sameText(a, b) {
  const left = normalize(a);
  const right = normalize(b);
  if (!left || !right) return false;
  return left === right;
}

function applyDistributorScope(payload, authUser) {
  payload.companyId = normalize(authUser?.companyId);
  payload.companyName = normalize(authUser?.companyName);
  payload.warehouseId = normalize(authUser?.warehouseId);
  payload.warehouseName = normalize(authUser?.warehouseName);
  payload.regionId = normalize(authUser?.regionId);
  payload.regionName = normalize(authUser?.regionName);
  payload.zoneId = normalize(authUser?.zoneId);
  payload.zoneName = normalize(authUser?.zoneName);
  payload.territoryId = normalize(authUser?.territoryId);
  payload.territoryName = normalize(authUser?.territoryName);
  payload.distributorId = normalize(authUser?.uid || authUser?._id || authUser?.distributorId || authUser?.userId);
  payload.distributorName = normalize(authUser?.fullName || authUser?.distributorName);
}

function assertDistributorTargetAllowed(target, authUser) {
  if (!isDistributorManageableRole(target?.role)) return false;

  if (normalize(authUser?.companyId) && normalize(target?.companyId) && !sameText(target.companyId, authUser.companyId)) {
    return false;
  }
  if (normalize(authUser?.territoryId) && normalize(target?.territoryId) && !sameText(target.territoryId, authUser.territoryId)) {
    return false;
  }
  if (normalize(authUser?.territoryName) && normalize(target?.territoryName) && !sameText(target.territoryName, authUser.territoryName)) {
    return false;
  }
  return true;
}

function getValueFromBody(body, key) {
  if (key === "mobile") return normalize(body.mobile || body.mobileNumber);
  return normalize(body[key]);
}

function buildRoleAwarePayload(body, fallbackRole = "") {
  const role = normalize(body.role) || fallbackRole;
  const allowedProfileFields = new Set([...(ROLE_PROFILE_FIELDS[role] || []), ...COMMON_PROFILE_FIELDS]);

  const payload = {
    username: normalize(body.username).toLowerCase(),
    fullName: normalize(body.fullName),
    mobile: getValueFromBody(body, "mobile"),
    role,
    status: normalize(body.status) || "active",
    userId: normalize(body.userId),
  };

  for (const field of allowedProfileFields) {
    const value = getValueFromBody(body, field);
    if (value) payload[field] = value;
  }

  if (!payload.mobileNumber && payload.mobile) payload.mobileNumber = payload.mobile;

  const unset = {};
  for (const field of OPTIONAL_PROFILE_FIELDS) {
    if (!allowedProfileFields.has(field)) unset[field] = 1;
  }

  return { payload, unset };
}

async function findExistingUserByField(field, value, excludeId = null) {
  const normalizedValue = normalize(value);
  if (!normalizedValue) return null;
  const baseQuery = { [field]: normalizedValue };
  if (excludeId) baseQuery._id = { $ne: excludeId };

  const primary = await User.findOne(baseQuery).lean();
  if (primary) return primary;

  const targets = await listAllTenantTargets();
  for (const target of targets) {
    const TenantUser = await getTenantModel(User, target.companyId, target.companyName);
    if (!TenantUser) continue;
    const tenantUser = await TenantUser.findOne(baseQuery).lean();
    if (tenantUser) return tenantUser;
  }
  return null;
}

async function findScopedUserById(id, reqUser) {
  const reqCompanyId = normalize(reqUser?.companyId);
  if (isSystemLevelAdmin(reqUser?.role)) {
    const primary = await User.findById(id).select("-passwordHash").lean();
    if (primary) return { user: primary, isTenant: false, companyId: normalize(primary.companyId), companyName: normalize(primary.companyName) };
    const tenantMatch = await findTenantUserById(id);
    if (tenantMatch?.doc) return { user: tenantMatch.doc, isTenant: true, companyId: tenantMatch.companyId, companyName: tenantMatch.companyName };
    return { user: null, isTenant: false, companyId: "", companyName: "" };
  }

  if (reqCompanyId) {
    const tenantMatch = await findTenantUserById(id, reqCompanyId, normalize(reqUser?.companyName));
    if (tenantMatch?.doc) return { user: tenantMatch.doc, isTenant: true, companyId: reqCompanyId, companyName: normalize(reqUser?.companyName) };
  }

  const legacy = await User.findById(id).select("-passwordHash").lean();
  if (legacy) return { user: legacy, isTenant: false, companyId: normalize(legacy.companyId), companyName: normalize(legacy.companyName) };
  return { user: null, isTenant: false, companyId: "", companyName: "" };
}

async function loadCurrentUser(req) {
  const scoped = await findScopedUserById(req.user.uid, req.user);
  return scoped.user;
}

async function listUsersForRequest(req) {
  const requestedRole = normalize(req.query.role);
  if (isDistributor(req.user?.role)) {
    let users = await listTenantUsersByCompany(req.user?.companyId);
    users = users.filter((user) => ["salesman", "order booker", "orderbooker", "customer"].includes(normalizeRole(user.role)));
    const territoryId = normalize(req.user?.territoryId);
    const territoryName = normalize(req.user?.territoryName);
    if (territoryId || territoryName) {
      users = users.filter((user) => {
        const matchesTerritoryId = territoryId && normalize(user.territoryId) === territoryId;
        const matchesTerritoryName = territoryName && normalize(user.territoryName || user.areaName) === territoryName;
        return matchesTerritoryId || matchesTerritoryName;
      });
    }
    if (requestedRole) users = users.filter((user) => normalizeRole(user.role) === requestedRole);
    return users.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }

  if (isCompanyAdmin(req.user?.role)) {
    let users = await listTenantUsersByCompany(req.user?.companyId);
    if (requestedRole) users = users.filter((user) => normalizeRole(user.role) === requestedRole);
    return users;
  }

  if (req.query.companyId) {
    let users = await listTenantUsersByCompany(req.query.companyId);
    if (requestedRole) users = users.filter((user) => normalizeRole(user.role) === requestedRole);
    return users;
  }

  const primaryQuery = {};
  if (requestedRole) primaryQuery.role = new RegExp(`^${escapeRegex(requestedRole)}$`, "i");
  const primaryUsers = await User.find(primaryQuery).select("-passwordHash").sort({ createdAt: -1 }).lean();
  const tenantUsers = await listAllTenantUsers(requestedRole);
  return [...tenantUsers, ...primaryUsers].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

async function listAllTenantUsers(roleFilter = "") {
  const users = [];
  const targets = await listAllTenantTargets();
  for (const target of targets) {
    const TenantUser = await getTenantModel(User, target.companyId, target.companyName);
    if (!TenantUser) continue;
    const query = roleFilter ? { role: new RegExp(`^${escapeRegex(roleFilter)}$`, "i") } : {};
    const rows = await TenantUser.find(query).select("-passwordHash").lean();
    if (rows?.length) users.push(...rows);
  }
  return users;
}


router.get("/me", requireAuth, async (req, res) => {
  const user = await loadCurrentUser(req);
  if (!user) return res.status(404).json({ ok: false, message: "User not found" });
  return res.json({ ok: true, user });
});

router.put("/me", requireAuth, async (req, res) => {
  const body = req.body || {};
  const scoped = await findScopedUserById(req.user.uid, req.user);
  if (!scoped.user) return res.status(404).json({ ok: false, message: "User not found" });

  const updatePayload = {
    fullName: normalize(body.fullName),
    email: normalize(body.email),
    mobile: normalize(body.mobile || body.mobileNumber),
    address: normalize(body.address),
  };

  let updated;
  if (scoped.isTenant) {
    updated = await updateUserInTenant(req.user.uid, { $set: updatePayload }, scoped.companyId, scoped.companyName);
  } else {
    updated = await User.findByIdAndUpdate(req.user.uid, updatePayload, { new: true, runValidators: true }).select("-passwordHash");
  }
  return res.json({ ok: true, user: updated });
});

router.put("/change-password", requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  const validation = validatePassword(newPassword);
  if (!validation.ok) return res.status(400).json({ ok: false, message: validation.message });

  const scoped = await findScopedUserById(req.user.uid, req.user);
  const user = scoped.user;
  if (!user) return res.status(404).json({ ok: false, message: "User not found" });
  const ok = await verifyPassword(String(currentPassword || ""), user.passwordHash);
  if (!ok) return res.status(401).json({ ok: false, message: "Current password is incorrect" });

  const nextHash = await hashPassword(newPassword);
  if (scoped.isTenant) {
    await updateUserInTenant(req.user.uid, { $set: { passwordHash: nextHash } }, scoped.companyId, scoped.companyName);
  } else {
    await User.findByIdAndUpdate(req.user.uid, { passwordHash: nextHash });
  }
  return res.json({ ok: true });
});

router.post("/", requireAuth, requireRole("admin", "distributor"), createModuleAccessGuard("hr.users.add"), async (req, res) => {
  const body = req.body || {};
  if (!body.fullName || !body.role || !(body.mobile || body.mobileNumber)) {
    return res.status(400).json({ ok: false, message: "Missing required fields" });
  }
  const validation = validatePassword(body.password);
  if (!validation.ok) return res.status(400).json({ ok: false, message: validation.message });

  const normalizedMobile = normalize(body.mobile || body.mobileNumber);
  const existingMobile = await findExistingUserByField("mobile", normalizedMobile);
  if (existingMobile) return res.status(409).json({ ok: false, message: "Mobile already exists" });

  const normalizedUserId = normalize(body.userId);
  if (normalizedUserId) {
    const existingUserId = await findExistingUserByField("userId", normalizedUserId);
    if (existingUserId) return res.status(409).json({ ok: false, message: "User ID already exists" });
  }

  const targetRole = normalizeRole(body.role);
  const requiresCompany = targetRole && !isSystemLevelAdmin(targetRole);
  if (isDistributor(req.user?.role) && !isDistributorManageableRole(targetRole)) {
    return res.status(403).json({ ok: false, message: "Distributor can only create Salesman, Order Booker, and customer users." });
  }
  if (isCompanyAdmin(req.user?.role) && COMPANY_ADMIN_BLOCKED_CREATE_ROLES.has(targetRole)) {
    return res.status(403).json({ ok: false, message: "Company admin cannot create admin, system admin, or company admin users." });
  }

  const { payload } = buildRoleAwarePayload(body);
  if (isDistributor(req.user?.role)) {
    applyDistributorScope(payload, req.user);
    if (!payload.territoryId && !payload.territoryName) {
      return res.status(400).json({ ok: false, message: "Distributor territory mapping is required." });
    }
  } else if (isCompanyAdmin(req.user?.role)) {
    payload.companyId = normalize(req.user?.companyId);
    payload.companyName = normalize(req.user?.companyName);
    if (!payload.companyId) {
      return res.status(400).json({ ok: false, message: "Company admin must belong to a company." });
    }
  } else if (requiresCompany && !normalize(payload.companyId)) {
    return res.status(400).json({ ok: false, message: "Company is required for this role." });
  }

  payload.username = payload.username || payload.mobile;
  payload.passwordHash = await hashPassword(body.password);

  let user;
  if (requiresCompany || isCompanyAdmin(req.user?.role) || isDistributor(req.user?.role)) {
    user = await createUserInTenant(payload);
  } else {
    user = await User.create(payload);
  }

  return res.status(201).json({ ok: true, user: { id: user._id } });
});

router.get("/", requireAuth, requireRole("admin", "distributor"), createModuleAccessGuard("hr.users.list"), async (req, res) => {
  const users = await listUsersForRequest(req);
  return res.json({ ok: true, users });
});

router.get("/distributors", requireAuth, async (req, res) => {
  try {
    const territoryName = normalize(req.query.territoryName || req.user?.territoryName || req.user?.areaName);
    const limit = Math.min(Number(req.query.limit) || 100, 300);
    const query = { role: "Distributor" };
    if (territoryName) {
      query.$or = [
        { territoryName },
        { areaName: territoryName },
      ];
    }

    const users = await User.find(query)
      .select("userId fullName businessName warehouseId warehouseName territoryName areaName address shopAddress")
      .sort({ fullName: 1 })
      .limit(limit)
      .lean();

    return res.json({ ok: true, users });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load distributors" });
  }
});

router.get("/:id", requireAuth, requireRole("admin", "distributor"), createModuleAccessGuard("hr.users.list"), async (req, res) => {
  const scoped = await findScopedUserById(req.params.id, req.user);
  const user = scoped.user;
  if (!user) return res.status(404).json({ ok: false, message: "User not found" });
  if (isDistributor(req.user?.role) && !assertDistributorTargetAllowed(user, req.user)) {
    return res.status(403).json({ ok: false, message: "Forbidden" });
  }
  if (isCompanyAdmin(req.user?.role) && normalize(user.companyId) !== normalize(req.user?.companyId)) {
    return res.status(403).json({ ok: false, message: "Forbidden" });
  }
  return res.json({ ok: true, user });
});

router.put("/:id", requireAuth, requireRole("admin", "distributor"), createModuleAccessGuard("hr.users.list"), async (req, res) => {
  const body = req.body || {};
  const scoped = await findScopedUserById(req.params.id, req.user);
  const existing = scoped.user;
  if (!existing) return res.status(404).json({ ok: false, message: "User not found" });
  if (isDistributor(req.user?.role) && !assertDistributorTargetAllowed(existing, req.user)) {
    return res.status(403).json({ ok: false, message: "Forbidden" });
  }
  if (isCompanyAdmin(req.user?.role) && normalize(existing.companyId) !== normalize(req.user?.companyId)) {
    return res.status(403).json({ ok: false, message: "Forbidden" });
  }

  const { payload, unset } = buildRoleAwarePayload(body, existing.role);
  const effectiveRole = normalizeRole(payload.role || existing.role);
  const requiresCompany = effectiveRole && !isSystemLevelAdmin(effectiveRole);
  if (isDistributor(req.user?.role)) {
    if (!isDistributorManageableRole(effectiveRole)) {
      return res.status(403).json({ ok: false, message: "Distributor can only manage Salesman, Order Booker, and customer users." });
    }
    applyDistributorScope(payload, req.user);
  } else if (isCompanyAdmin(req.user?.role)) {
    payload.companyId = normalize(req.user?.companyId);
    payload.companyName = normalize(req.user?.companyName);
  } else if (requiresCompany && !normalize(payload.companyId || existing.companyId)) {
    return res.status(400).json({ ok: false, message: "Company is required for this role." });
  }

  if (payload.userId) {
    const duplicateUserId = await findExistingUserByField("userId", payload.userId, existing._id);
    if (duplicateUserId) return res.status(409).json({ ok: false, message: "User ID already exists" });
  }
  if (payload.mobile) {
    const duplicateMobile = await findExistingUserByField("mobile", payload.mobile, existing._id);
    if (duplicateMobile) return res.status(409).json({ ok: false, message: "Mobile already exists" });
  }

  if (body.password) {
    const validation = validatePassword(body.password);
    if (!validation.ok) return res.status(400).json({ ok: false, message: validation.message });
    payload.passwordHash = await hashPassword(body.password);
  }

  let updated;
  const nextCompanyId = normalize(payload.companyId || existing.companyId);
  const nextCompanyName = normalize(payload.companyName || existing.companyName);

  if (scoped.isTenant || requiresCompany || isCompanyAdmin(req.user?.role) || isDistributor(req.user?.role)) {
    if (scoped.isTenant && nextCompanyId && nextCompanyId !== scoped.companyId) {
      await deleteUserFromTenant(existing._id, scoped.companyId, scoped.companyName);
      const TenantUser = await getTenantModel(User, nextCompanyId, nextCompanyName);
      updated = await TenantUser.findOneAndUpdate(
        { _id: existing._id },
        { $set: payload, $unset: unset },
        { new: true, upsert: true, runValidators: true }
      ).select("-passwordHash");
    } else if (scoped.isTenant) {
      updated = await updateUserInTenant(req.params.id, { $set: payload, $unset: unset }, scoped.companyId, scoped.companyName);
    } else {
      const TenantUser = await getTenantModel(User, nextCompanyId, nextCompanyName);
      updated = await TenantUser.findOneAndUpdate(
        { _id: existing._id },
        { $set: { ...existing, ...payload }, $unset: unset },
        { new: true, upsert: true, runValidators: true }
      ).select("-passwordHash");
      await User.findByIdAndDelete(existing._id);
    }
  } else {
    updated = await User.findByIdAndUpdate(
      req.params.id,
      { $set: payload, $unset: unset },
      { new: true, runValidators: true }
    ).select("-passwordHash");
  }

  return res.json({ ok: true, user: updated });
});

router.delete("/:id", requireAuth, requireRole("admin", "distributor"), createModuleAccessGuard("hr.users.list"), async (req, res) => {
  const scoped = await findScopedUserById(req.params.id, req.user);
  const existing = scoped.user;
  if (!existing) return res.status(404).json({ ok: false, message: "User not found" });
  if (isDistributor(req.user?.role) && !assertDistributorTargetAllowed(existing, req.user)) {
    return res.status(403).json({ ok: false, message: "Forbidden" });
  }
  if (isCompanyAdmin(req.user?.role) && normalize(existing.companyId) !== normalize(req.user?.companyId)) {
    return res.status(403).json({ ok: false, message: "Forbidden" });
  }

  if (scoped.isTenant) {
    await deleteUserFromTenant(existing._id, scoped.companyId, scoped.companyName);
  } else {
    await User.findByIdAndDelete(existing._id);
  }
  return res.json({ ok: true });
});

module.exports = router;