const express = require("express");
const mongoose = require("mongoose");
const Region = require("../models/Region");
const Zone = require("../models/Zone");
const Area = require("../models/Area");
const User = require("../models/User");
const Warehouse = require("../models/Warehouse");
const PrimaryPayment = require("../models/PrimaryPayment");
const SecondaryPayment = require("../models/SecondaryPayment");
const { requireAuth } = require("../utils/auth");

const router = express.Router();

function toObjectId(value) {
  if (!value || !mongoose.Types.ObjectId.isValid(value)) return null;
  return new mongoose.Types.ObjectId(value);
}

function normalizeRole(value) {
  return String(value || "").trim().toLowerCase();
}

function isWarehouseManagerUser(user) {
  const role = normalizeRole(user?.role);
  return role === "warehouse manager" || role === "warehouse_manager";
}

async function resolveScopedWarehouse(req) {
  if (!isWarehouseManagerUser(req.user)) return null;

  const refs = new Set();
  const tokenWarehouseId = String(req.user?.warehouseId || req.user?.warehouse_id || "").trim();
  if (tokenWarehouseId) refs.add(tokenWarehouseId);

  const dbUser = req.user?.uid ? await User.findById(req.user.uid).select("warehouseId warehouseName").lean() : null;
  const dbWarehouseId = String(dbUser?.warehouseId || "").trim();
  const dbWarehouseName = String(dbUser?.warehouseName || "").trim();
  if (dbWarehouseId) refs.add(dbWarehouseId);
  if (dbWarehouseName) refs.add(dbWarehouseName);

  for (const ref of refs) {
    const warehouseById = toObjectId(ref) ? await Warehouse.findById(ref).lean() : null;
    if (warehouseById) return warehouseById;

    const warehouseByCode = await Warehouse.findOne({ warehouseId: ref }).lean();
    if (warehouseByCode) return warehouseByCode;

    const warehouseByName = await Warehouse.findOne({ name: ref }).lean();
    if (warehouseByName) return warehouseByName;
  }

  return null;
}

async function ensureWarehouseManagerHasWarehouse(req, res) {
  const warehouse = await resolveScopedWarehouse(req);
  if (!warehouse) {
    res.status(403).json({ ok: false, message: "Warehouse manager is not mapped to a warehouse" });
    return null;
  }
  return warehouse;
}

async function generateInvoiceNo() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const invoiceNo = `PP-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0")}`;
    const exists = await PrimaryPayment.exists({ invoiceNo });
    if (!exists) return invoiceNo;
  }
  throw new Error("Could not generate unique invoice number");
}

router.post("/primary", requireAuth, async (req, res) => {
  try {
    const body = req.body || {};
    const amountTotal = Number(body.amount);
    if (!Number.isFinite(amountTotal) || amountTotal <= 0) {
      return res.status(400).json({ ok: false, message: "Amount must be greater than zero" });
    }

    let warehouseObjectId = toObjectId(body.warehouseId);
    if (isWarehouseManagerUser(req.user)) {
      const scopedWarehouse = await ensureWarehouseManagerHasWarehouse(req, res);
      if (!scopedWarehouse) return;
      warehouseObjectId = scopedWarehouse._id;
    }

    const [region, zone, territory, distributor, warehouse] = await Promise.all([
      Region.findById(body.regionId).lean(),
      Zone.findById(body.zoneId).lean(),
      Area.findById(body.territoryId).lean(),
      User.findOne({ _id: body.distributorId, role: "Distributor" }).lean(),
      warehouseObjectId ? Warehouse.findById(warehouseObjectId).lean() : null,
    ]);

    if (!region || !zone || !territory || !distributor || !warehouse) {
      return res.status(400).json({ ok: false, message: "Invalid region, zone, territory, distributor, or warehouse" });
    }

    if (String(zone.regionId || "") !== String(region.regionId || "")) {
      return res.status(400).json({ ok: false, message: "Zone does not belong to selected region" });
    }

    if (String(territory.zoneId || "") !== String(zone.zoneId || "")) {
      return res.status(400).json({ ok: false, message: "Territory does not belong to selected zone" });
    }

    if (String(distributor.territoryId || "") !== String(territory.areaId || "")) {
      return res.status(400).json({ ok: false, message: "Distributor does not belong to selected territory" });
    }

    const invoiceNo = await generateInvoiceNo();
    const amountPaidBack = 0;
    const amountRemaining = amountTotal;

    const primary = await PrimaryPayment.create({
      invoiceNo,
      regionId: region.regionId,
      regionName: region.name,
      zoneId: zone.zoneId,
      zoneName: zone.name,
      territoryId: territory.areaId,
      territoryName: territory.name,
      distributorId: distributor._id,
      distributorName: distributor.fullName,
      distributorAddress: String(distributor.shopAddress || distributor.address || "").trim(),
      warehouseId: warehouse._id,
      warehouseName: warehouse.name,
      amountTotal,
      payDate: body.payDate,
      returnDate: body.returnDate,
      details: String(body.details || "").trim(),
      amountPaidBack,
      amountRemaining,
      createdBy: req.user?.uid,
    });

    return res.status(201).json({ ok: true, primaryPayment: primary });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to create primary payment" });
  }
});

router.get("/primary", requireAuth, async (req, res) => {
  try {
    const query = {};
    if (req.query.distributorId) {
      const distributorId = toObjectId(req.query.distributorId);
      if (distributorId) query.distributorId = distributorId;
    }

    if (isWarehouseManagerUser(req.user)) {
      const scopedWarehouse = await ensureWarehouseManagerHasWarehouse(req, res);
      if (!scopedWarehouse) return;
      query.warehouseId = scopedWarehouse._id;
    } else if (req.query.warehouseId) {
      const warehouseId = toObjectId(req.query.warehouseId);
      if (warehouseId) query.warehouseId = warehouseId;
    }

    const items = await PrimaryPayment.find(query).sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, primaryPayments: items });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to load primary payments" });
  }
});

router.get("/primary/:invoiceNo", requireAuth, async (req, res) => {
  try {
    const primary = await PrimaryPayment.findOne({ invoiceNo: req.params.invoiceNo }).lean();
    if (!primary) return res.status(404).json({ ok: false, message: "Primary invoice not found" });

    if (isWarehouseManagerUser(req.user)) {
      const scopedWarehouse = await ensureWarehouseManagerHasWarehouse(req, res);
      if (!scopedWarehouse) return;
      if (String(primary.warehouseId) !== String(scopedWarehouse._id)) {
        return res.status(403).json({ ok: false, message: "Forbidden" });
      }
    }

    const settlements = await SecondaryPayment.find({ primaryPaymentId: primary._id }).sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, primaryPayment: primary, settlements });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to load invoice details" });
  }
});

router.delete("/primary/:id", requireAuth, async (req, res) => {
  try {
    const primary = await PrimaryPayment.findById(req.params.id).lean();
    if (!primary) return res.status(404).json({ ok: false, message: "Primary payment not found" });

    if (isWarehouseManagerUser(req.user)) {
      const scopedWarehouse = await ensureWarehouseManagerHasWarehouse(req, res);
      if (!scopedWarehouse) return;
      if (String(primary.warehouseId) !== String(scopedWarehouse._id)) {
        return res.status(403).json({ ok: false, message: "Forbidden" });
      }
    }

    const linked = await SecondaryPayment.exists({ primaryPaymentId: primary._id });
    if (linked) {
      return res.status(409).json({ ok: false, message: "Cannot delete primary payment with secondary settlements" });
    }

    await PrimaryPayment.findByIdAndDelete(primary._id);
    return res.json({ ok: true });
  } catch (error) {
    return res.status(400).json({ ok: false, message: "Invalid primary payment id" });
  }
});

router.post("/secondary", requireAuth, async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const body = req.body || {};
    const amountPaid = Number(body.amountPaid);
    if (!Number.isFinite(amountPaid) || amountPaid <= 0) {
      return res.status(400).json({ ok: false, message: "Amount paid must be greater than zero" });
    }

    let scopedWarehouseObjectId = null;
    if (isWarehouseManagerUser(req.user)) {
      const scopedWarehouse = await ensureWarehouseManagerHasWarehouse(req, res);
      if (!scopedWarehouse) return;
      scopedWarehouseObjectId = scopedWarehouse._id;
    }

    let createdSecondary = null;
    await session.withTransaction(async () => {
      const primary = await PrimaryPayment.findOne({ invoiceNo: String(body.primaryInvoiceNo || "").trim() }).session(session);
      if (!primary) throw new Error("Primary invoice does not exist");

      const expectedWarehouseId = scopedWarehouseObjectId || toObjectId(body.warehouseId);
      if (!expectedWarehouseId) throw new Error("Warehouse is required");

      if (String(primary.distributorId) !== String(body.distributorId) || String(primary.warehouseId) !== String(expectedWarehouseId)) {
        throw new Error("Distributor and warehouse must match the selected primary invoice");
      }

      if (amountPaid > Number(primary.amountRemaining || 0)) {
        throw new Error("Amount paid cannot be greater than remaining amount");
      }

      createdSecondary = await SecondaryPayment.create(
        [
          {
            primaryPaymentId: primary._id,
            primaryInvoiceNo: primary.invoiceNo,
            distributorId: primary.distributorId,
            distributorName: primary.distributorName,
            distributorAddress: String(primary.distributorAddress || "").trim(),
            warehouseId: primary.warehouseId,
            warehouseName: primary.warehouseName,
            amountPaid,
            paidDate: body.paidDate,
            details: String(body.details || "").trim(),
            createdBy: req.user?.uid,
          },
        ],
        { session }
      );

      primary.amountPaidBack = Number(primary.amountPaidBack || 0) + amountPaid;
      primary.amountRemaining = Math.max(0, Number(primary.amountTotal || 0) - Number(primary.amountPaidBack || 0));
      await primary.save({ session });
    });

    return res.status(201).json({ ok: true, secondaryPayment: createdSecondary?.[0] || null });
  } catch (error) {
    return res.status(400).json({ ok: false, message: error.message || "Failed to create secondary payment" });
  } finally {
    await session.endSession();
  }
});

router.get("/secondary", requireAuth, async (req, res) => {
  try {
    const query = {};
    if (isWarehouseManagerUser(req.user)) {
      const scopedWarehouse = await ensureWarehouseManagerHasWarehouse(req, res);
      if (!scopedWarehouse) return;
      query.warehouseId = scopedWarehouse._id;
    }

    const rows = await SecondaryPayment.find(query).sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, secondaryPayments: rows });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to load secondary payments" });
  }
});

router.delete("/secondary/:id", requireAuth, async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const scopedWarehouseObjectId = isWarehouseManagerUser(req.user)
      ? (await ensureWarehouseManagerHasWarehouse(req, res))?._id
      : null;
    if (isWarehouseManagerUser(req.user) && !scopedWarehouseObjectId) return;

    await session.withTransaction(async () => {
      const secondary = await SecondaryPayment.findById(req.params.id).session(session);
      if (!secondary) throw new Error("Secondary payment not found");

      if (scopedWarehouseObjectId && String(secondary.warehouseId) !== String(scopedWarehouseObjectId)) {
        throw new Error("Forbidden");
      }

      const primary = await PrimaryPayment.findById(secondary.primaryPaymentId).session(session);
      if (!primary) throw new Error("Linked primary payment not found");

      if (scopedWarehouseObjectId && String(primary.warehouseId) !== String(scopedWarehouseObjectId)) {
        throw new Error("Forbidden");
      }

      primary.amountPaidBack = Math.max(0, Number(primary.amountPaidBack || 0) - Number(secondary.amountPaid || 0));
      primary.amountRemaining = Math.max(0, Number(primary.amountTotal || 0) - Number(primary.amountPaidBack || 0));

      await primary.save({ session });
      await secondary.deleteOne({ session });
    });

    return res.json({ ok: true });
  } catch (error) {
    const status = String(error.message || "").toLowerCase() === "forbidden" ? 403 : 400;
    return res.status(status).json({ ok: false, message: error.message || "Failed to delete secondary payment" });
  } finally {
    await session.endSession();
  }
});

module.exports = router;
