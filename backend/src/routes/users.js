const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { requireAuth, requireRole } = require("../utils/auth");
const { validatePassword } = require("../utils/password");

const router = express.Router();

function normalize(value) {
  return typeof value === "string" ? value.trim() : "";
}

function buildUserPayload(body) {
  return {
    username: normalize(body.username).toLowerCase(),
    fullName: normalize(body.fullName),
    mobile: normalize(body.mobile),
    role: normalize(body.role),
    status: normalize(body.status) || "active",
    email: normalize(body.email),
    companyId: normalize(body.companyId),
    companyName: normalize(body.companyName),
    companyBranchId: normalize(body.companyBranchId),
    branchId: normalize(body.branchId),
    branchNameOrNumber: normalize(body.branchNameOrNumber),
    warehouseId: normalize(body.warehouseId),
    warehouseName: normalize(body.warehouseName),
    regionId: normalize(body.regionId),
    regionName: normalize(body.regionName),
    zoneId: normalize(body.zoneId),
    zoneName: normalize(body.zoneName),
    areaId: normalize(body.areaId),
    areaName: normalize(body.areaName),
    shopId: normalize(body.shopId),
    shopName: normalize(body.shopName),
    address: normalize(body.address),
    shopAddress: normalize(body.shopAddress),
    cnicNo: normalize(body.cnicNo),
    mobileNumber: normalize(body.mobileNumber),
    phoneNumber: normalize(body.phoneNumber),
    gpsLatitude: normalize(body.gpsLatitude),
    gpsLongitude: normalize(body.gpsLongitude),
    managerId: normalize(body.managerId),
    managerName: normalize(body.managerName),
    warehouseManagerId: normalize(body.warehouseManagerId),
    warehouseManagerName: normalize(body.warehouseManagerName),
    accountantId: normalize(body.accountantId),
    accountantName: normalize(body.accountantName),
    distributorId: normalize(body.distributorId),
    distributorName: normalize(body.distributorName),
    driverId: normalize(body.driverId),
    driverName: normalize(body.driverName),
    deliveryBoyId: normalize(body.deliveryBoyId),
    deliveryBoyName: normalize(body.deliveryBoyName),
    salesmanId: normalize(body.salesmanId),
    salesmanName: normalize(body.salesmanName),
    orderBookerId: normalize(body.orderBookerId),
    orderBookerName: normalize(body.orderBookerName),
    customerId: normalize(body.customerId),
    customerName: normalize(body.customerName),
    supplierId: normalize(body.supplierId),
    supplierName: normalize(body.supplierName),
    supplierWarehouseId1: normalize(body.supplierWarehouseId1),
    supplierWarehouseName1: normalize(body.supplierWarehouseName1),
    supplierWarehouseId2: normalize(body.supplierWarehouseId2),
    supplierWarehouseName2: normalize(body.supplierWarehouseName2),
  };
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
      mobile: normalize(body.mobile),
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
  const ok = await bcrypt.compare(String(currentPassword || ""), user.passwordHash);
  if (!ok) return res.status(401).json({ ok: false, message: "Current password is incorrect" });

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  await user.save();
  return res.json({ ok: true });
});

router.post("/", requireAuth, requireRole("admin"), async (req, res) => {
  const body = req.body || {};
  if (!body.fullName || !body.role || !body.mobile) {
    return res.status(400).json({ ok: false, message: "Missing required fields" });
  }
  const validation = validatePassword(body.password);
  if (!validation.ok) return res.status(400).json({ ok: false, message: validation.message });

  const existingMobile = await User.findOne({ mobile: normalize(body.mobile) });
  if (existingMobile) return res.status(409).json({ ok: false, message: "Mobile already exists" });

  const payload = buildUserPayload(body);
  payload.username = payload.username || payload.mobile;
  payload.passwordHash = await bcrypt.hash(body.password, 12);

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
  const payload = buildUserPayload(body);
  if (body.password) {
    const validation = validatePassword(body.password);
    if (!validation.ok) return res.status(400).json({ ok: false, message: validation.message });
    payload.passwordHash = await bcrypt.hash(body.password, 12);
  }

  const updated = await User.findByIdAndUpdate(req.params.id, payload, {
    new: true,
    runValidators: true,
  }).select("-passwordHash");
  if (!updated) return res.status(404).json({ ok: false, message: "User not found" });
  return res.json({ ok: true, user: updated });
});

router.delete("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const deleted = await User.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ ok: false, message: "User not found" });
  return res.json({ ok: true });
});

module.exports = router;
