const express = require("express");
const User = require("../models/User");
const { requireAuth, requireRole } = require("../utils/auth");
const { validatePassword } = require("../utils/password");
const { hashPassword, verifyPassword } = require("../utils/passwordHash");

const router = express.Router();

const COMMON_PROFILE_FIELDS = ["email", "address", "cnicNo", "mobileNumber", "phoneNumber"];
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
];

function normalize(value) {
  return typeof value === "string" ? value.trim() : "";
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

router.get("/me", requireAuth, async (req, res) => {
  const user = await User.findById(req.user.uid).select("-passwordHash").lean();
  if (!user) return res.status(404).json({ ok: false, message: "User not found" });
  return res.json({ ok: true, user });
});

router.put("/me", requireAuth, async (req, res) => {
  const body = req.body || {};
  const updated = await User.findByIdAndUpdate(
    req.user.uid,
    {
      fullName: normalize(body.fullName),
      email: normalize(body.email),
      mobile: normalize(body.mobile || body.mobileNumber),
      address: normalize(body.address),
    },
    { new: true, runValidators: true }
  ).select("-passwordHash");
  return res.json({ ok: true, user: updated });
});

router.put("/change-password", requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  const validation = validatePassword(newPassword);
  if (!validation.ok) return res.status(400).json({ ok: false, message: validation.message });

  const user = await User.findById(req.user.uid);
  if (!user) return res.status(404).json({ ok: false, message: "User not found" });
  const ok = await verifyPassword(String(currentPassword || ""), user.passwordHash);
  if (!ok) return res.status(401).json({ ok: false, message: "Current password is incorrect" });

  user.passwordHash = await hashPassword(newPassword);
  await user.save();
  return res.json({ ok: true });
});

router.post("/", requireAuth, requireRole("admin"), async (req, res) => {
  const body = req.body || {};
  if (!body.fullName || !body.role || !(body.mobile || body.mobileNumber)) {
    return res.status(400).json({ ok: false, message: "Missing required fields" });
  }
  const validation = validatePassword(body.password);
  if (!validation.ok) return res.status(400).json({ ok: false, message: validation.message });

  const existingMobile = await User.findOne({ mobile: normalize(body.mobile || body.mobileNumber) });
  if (existingMobile) return res.status(409).json({ ok: false, message: "Mobile already exists" });

  const { payload } = buildRoleAwarePayload(body);
  payload.username = payload.username || payload.mobile;
  payload.passwordHash = await hashPassword(body.password);

  const user = await User.create(payload);
  return res.status(201).json({ ok: true, user: { id: user._id } });
});

router.get("/", requireAuth, requireRole("admin"), async (req, res) => {
  const query = {};
  if (req.query.companyId) query.companyId = String(req.query.companyId);
  if (req.query.role) query.role = String(req.query.role);
  const users = await User.find(query).select("-passwordHash").sort({ createdAt: -1 }).lean();
  return res.json({ ok: true, users });
});

router.get("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const user = await User.findById(req.params.id).select("-passwordHash").lean();
  if (!user) return res.status(404).json({ ok: false, message: "User not found" });
  return res.json({ ok: true, user });
});

router.put("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const body = req.body || {};
  const existing = await User.findById(req.params.id).lean();
  if (!existing) return res.status(404).json({ ok: false, message: "User not found" });

  const { payload, unset } = buildRoleAwarePayload(body, existing.role);
  if (body.password) {
    const validation = validatePassword(body.password);
    if (!validation.ok) return res.status(400).json({ ok: false, message: validation.message });
    payload.passwordHash = await hashPassword(body.password);
  }

  const updated = await User.findByIdAndUpdate(
    req.params.id,
    {
      $set: payload,
      $unset: unset,
    },
    { new: true, runValidators: true }
  ).select("-passwordHash");

  return res.json({ ok: true, user: updated });
});

router.delete("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const deleted = await User.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ ok: false, message: "User not found" });
  return res.json({ ok: true });
});

module.exports = router;
