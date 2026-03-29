const express = require("express");
const mongoose = require("mongoose");
const Region = require("../models/Region");
const Zone = require("../models/Zone");
const Area = require("../models/Area");
const User = require("../models/User");
const Warehouse = require("../models/Warehouse");
const PrimaryPayment = require("../models/PrimaryPayment");
const SecondaryPayment = require("../models/SecondaryPayment");
const Company = require("../models/Company");
const { requireAuth } = require("../utils/auth");
const { toTenantDatabaseName } = require("../utils/tenantDatabases");

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

function isDistributorUser(user) {
  return normalizeRole(user?.role) === "distributor";
}

function isSystemLevelAdmin(role) {
  const normalized = normalizeRole(role);
  return normalized === "admin" || normalized === "system admin";
}

async function resolveTenantDbName(companyId, companyName = "") {
  const normalizedCompanyId = String(companyId || "").trim();
  const normalizedCompanyName = String(companyName || "").trim();
  if (!normalizedCompanyId && !normalizedCompanyName) return "";
  if (normalizedCompanyName) return toTenantDatabaseName(normalizedCompanyName, normalizedCompanyId || "company");
  const company = await Company.findOne({ companyId: normalizedCompanyId }).select("name").lean();
  return toTenantDatabaseName(company?.name || normalizedCompanyId, normalizedCompanyId || "company");
}

function getModelFromDb(db, baseModel) {
  const modelName = baseModel.modelName;
  return db.models[modelName] || db.model(modelName, baseModel.schema, baseModel.collection.name);
}

async function getScopedPaymentModels(req, requestedCompanyId = "", requestedCompanyName = "") {
  const scopedCompanyId = isSystemLevelAdmin(req.user?.role)
    ? String(requestedCompanyId || "").trim()
    : String(req.user?.companyId || "").trim();
  const scopedCompanyName = isSystemLevelAdmin(req.user?.role)
    ? String(requestedCompanyName || "").trim()
    : String(req.user?.companyName || "").trim();

  if (!scopedCompanyId) {
    return { RegionModel: Region, ZoneModel: Zone, AreaModel: Area, UserModel: User, WarehouseModel: Warehouse, PrimaryPaymentModel: PrimaryPayment, SecondaryPaymentModel: SecondaryPayment };
  }

  const dbName = await resolveTenantDbName(scopedCompanyId, scopedCompanyName);
  if (!dbName) {
    return { RegionModel: Region, ZoneModel: Zone, AreaModel: Area, UserModel: User, WarehouseModel: Warehouse, PrimaryPaymentModel: PrimaryPayment, SecondaryPaymentModel: SecondaryPayment };
  }
  const tenantDb = mongoose.connection.useDb(dbName, { useCache: true });
  return {
    RegionModel: getModelFromDb(tenantDb, Region),
    ZoneModel: getModelFromDb(tenantDb, Zone),
    AreaModel: getModelFromDb(tenantDb, Area),
    UserModel: getModelFromDb(tenantDb, User),
    WarehouseModel: getModelFromDb(tenantDb, Warehouse),
    PrimaryPaymentModel: getModelFromDb(tenantDb, PrimaryPayment),
    SecondaryPaymentModel: getModelFromDb(tenantDb, SecondaryPayment),
  };
}

function startOfDay(value) {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(value) {
  const d = new Date(value);
  d.setHours(23, 59, 59, 999);
  return d;
}

function parseOptionalDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getDeadlineMeta(primary, dueSoonDays = 7) {
  const remaining = Number(primary?.amountRemaining || 0);
  if (remaining <= 0) {
    return { deadlineStatus: "settled", daysToDeadline: null };
  }

  const returnDate = parseOptionalDate(primary?.returnDate);
  if (!returnDate) {
    return { deadlineStatus: "on_track", daysToDeadline: null };
  }

  const today = startOfDay(new Date());
  const deadline = startOfDay(returnDate);
  const daysToDeadline = Math.ceil((deadline.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));

  if (daysToDeadline < 0) return { deadlineStatus: "overdue", daysToDeadline };
  if (daysToDeadline <= dueSoonDays) return { deadlineStatus: "due_soon", daysToDeadline };
  return { deadlineStatus: "on_track", daysToDeadline };
}

async function resolveDistributorScope(req, UserModel = User) {
  const tokenDistributorId = String(req.user?.distributorId || "").trim();
  if (toObjectId(tokenDistributorId)) {
    return { distributorObjectId: toObjectId(tokenDistributorId), distributorId: tokenDistributorId };
  }

  const lookupOr = [];
  if (req.user?.uid && toObjectId(req.user.uid)) lookupOr.push({ _id: req.user.uid });
  const tokenUserId = String(req.user?.userId || "").trim();
  if (tokenUserId) lookupOr.push({ userId: tokenUserId });
  const tokenUsername = String(req.user?.username || "").trim();
  if (tokenUsername) lookupOr.push({ username: tokenUsername.toLowerCase() });

  if (!lookupOr.length) return { distributorObjectId: null, distributorId: tokenDistributorId };

  const dbUser = await UserModel.findOne({ $or: lookupOr }).select("_id role").lean();
  const distributorObjectId = dbUser?._id && normalizeRole(dbUser.role) === "distributor" ? toObjectId(dbUser._id) : null;
  return { distributorObjectId, distributorId: distributorObjectId ? String(distributorObjectId) : tokenDistributorId };
}

async function resolveScopedWarehouse(req, UserModel = User, WarehouseModel = Warehouse) {
  if (!isWarehouseManagerUser(req.user)) return null;

  const refs = new Set();
  const tokenWarehouseId = String(req.user?.warehouseId || req.user?.warehouse_id || "").trim();
  if (tokenWarehouseId) refs.add(tokenWarehouseId);

  const dbUserQuery = [];
  if (req.user?.uid && toObjectId(req.user.uid)) {
    dbUserQuery.push({ _id: req.user.uid });
  }

  const tokenUserId = String(req.user?.userId || "").trim();
  if (tokenUserId) {
    dbUserQuery.push({ userId: tokenUserId });
  }

  const tokenUsername = String(req.user?.username || "").trim();
  if (tokenUsername) {
    dbUserQuery.push({ username: tokenUsername.toLowerCase() });
  }

  const dbUser = dbUserQuery.length > 0 ? await UserModel.findOne({ $or: dbUserQuery }).select("warehouseId warehouseName").lean() : null;
  const dbWarehouseId = String(dbUser?.warehouseId || "").trim();
  const dbWarehouseName = String(dbUser?.warehouseName || "").trim();
  if (dbWarehouseId) refs.add(dbWarehouseId);
  if (dbWarehouseName) refs.add(dbWarehouseName);

  for (const ref of refs) {
    const warehouseById = toObjectId(ref) ? await WarehouseModel.findById(ref).lean() : null;
    if (warehouseById) return warehouseById;

    const warehouseByCode = await WarehouseModel.findOne({ warehouseId: ref }).lean();
    if (warehouseByCode) return warehouseByCode;

    const warehouseByName = await WarehouseModel.findOne({ name: ref }).lean();
    if (warehouseByName) return warehouseByName;
  }

  return null;
}

async function ensureWarehouseManagerHasWarehouse(req, res, UserModel = User, WarehouseModel = Warehouse) {
  const warehouse = await resolveScopedWarehouse(req, UserModel, WarehouseModel);
  if (!warehouse) {
    res.status(403).json({ ok: false, message: "Warehouse manager is not mapped to a warehouse" });
    return null;
  }
  return warehouse;
}


router.get("/masters", requireAuth, async (req, res) => {
  try {
    const { RegionModel, ZoneModel, AreaModel, UserModel, WarehouseModel } = await getScopedPaymentModels(req, req.query?.companyId, req.query?.companyName);
    const scopedWarehouse = isWarehouseManagerUser(req.user) ? await ensureWarehouseManagerHasWarehouse(req, res, UserModel, WarehouseModel) : null;
    if (isWarehouseManagerUser(req.user) && !scopedWarehouse) return;

    const warehouseQuery = scopedWarehouse ? { _id: scopedWarehouse._id } : {};

    const [regions, zones, areas, warehouses] = await Promise.all([
      RegionModel.find({}).lean(),
      ZoneModel.find({}).lean(),
      AreaModel.find({}).lean(),
      WarehouseModel.find(warehouseQuery).lean(),
    ]);

    let distributorQuery = { role: "Distributor" };
    if (scopedWarehouse) {
      const scopedRefs = [String(scopedWarehouse._id || "").trim(), String(scopedWarehouse.warehouseId || "").trim(), String(scopedWarehouse.name || "").trim()].filter(Boolean);
      distributorQuery = {
        role: "Distributor",
        $or: [{ warehouseId: { $in: scopedRefs } }, { warehouseName: { $in: scopedRefs } }],
      };
    }

    let distributors = await UserModel.find(distributorQuery).select("fullName role territoryId warehouseId warehouseName").sort({ fullName: 1 }).lean();

    if (scopedWarehouse && distributors.length === 0) {
      distributors = await UserModel.find({ role: "Distributor" }).select("fullName role territoryId warehouseId warehouseName").sort({ fullName: 1 }).lean();
    }

    return res.json({ ok: true, regions, zones, areas, warehouses, users: distributors });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to load payment master data" });
  }
});

async function generateInvoiceNo(PrimaryPaymentModel = PrimaryPayment) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const invoiceNo = `PP-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0")}`;
    const exists = await PrimaryPaymentModel.exists({ invoiceNo });
    if (!exists) return invoiceNo;
  }
  throw new Error("Could not generate unique invoice number");
}

router.post("/primary", requireAuth, async (req, res) => {
  try {
    const { RegionModel, ZoneModel, AreaModel, UserModel, WarehouseModel, PrimaryPaymentModel } = await getScopedPaymentModels(
      req,
      req.body?.companyId || req.query?.companyId,
      req.body?.companyName || req.query?.companyName
    );
    const body = req.body || {};
    const amountTotal = Number(body.amount);
    if (!Number.isFinite(amountTotal) || amountTotal <= 0) {
      return res.status(400).json({ ok: false, message: "Amount must be greater than zero" });
    }

    let warehouseObjectId = toObjectId(body.warehouseId);
    if (isWarehouseManagerUser(req.user)) {
      const scopedWarehouse = await ensureWarehouseManagerHasWarehouse(req, res, UserModel, WarehouseModel);
      if (!scopedWarehouse) return;
      warehouseObjectId = scopedWarehouse._id;
    }

    const [region, zone, territory, distributor, warehouse] = await Promise.all([
      RegionModel.findById(body.regionId).lean(),
      ZoneModel.findById(body.zoneId).lean(),
      AreaModel.findById(body.territoryId).lean(),
      UserModel.findOne({ _id: body.distributorId, role: "Distributor" }).lean(),
      warehouseObjectId ? WarehouseModel.findById(warehouseObjectId).lean() : null,
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

    const invoiceNo = await generateInvoiceNo(PrimaryPaymentModel);
    const amountPaidBack = 0;
    const amountRemaining = amountTotal;

    const primary = await PrimaryPaymentModel.create({
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
    const { UserModel, PrimaryPaymentModel } = await getScopedPaymentModels(req, req.query?.companyId, req.query?.companyName);
    const query = {};
    const isDistributor = isDistributorUser(req.user);

    if (isDistributor) {
      const scope = await resolveDistributorScope(req, UserModel);
      if (!scope.distributorObjectId) {
        return res.status(403).json({ ok: false, message: "Forbidden: distributor mapping missing" });
      }
      query.distributorId = scope.distributorObjectId;
    } else if (req.query.distributorId) {
      const distributorId = toObjectId(req.query.distributorId);
      if (distributorId) query.distributorId = distributorId;
    }

    if (isWarehouseManagerUser(req.user)) {
      const { WarehouseModel } = await getScopedPaymentModels(req, req.query?.companyId, req.query?.companyName);
      const scopedWarehouse = await ensureWarehouseManagerHasWarehouse(req, res, UserModel, WarehouseModel);
      if (!scopedWarehouse) return;
      query.warehouseId = scopedWarehouse._id;
    } else if (req.query.warehouseId || req.query.warehouse_id) {
      const warehouseId = toObjectId(req.query.warehouseId || req.query.warehouse_id);
      if (warehouseId) query.warehouseId = warehouseId;
    }

    const startDate = parseOptionalDate(req.query.start_date);
    const endDate = parseOptionalDate(req.query.end_date);
    if (startDate || endDate) {
      query.payDate = {};
      if (startDate) query.payDate.$gte = startOfDay(startDate);
      if (endDate) query.payDate.$lte = endOfDay(endDate);
    }

    const status = String(req.query.status || "all").trim().toLowerCase();
    if (status === "open") query.amountRemaining = { $gt: 0 };
    if (status === "closed") query.amountRemaining = 0;

    const items = await PrimaryPaymentModel.find(query).sort({ createdAt: -1 }).lean();
    const dueSoonDays = Number(process.env.PAYMENT_DUE_SOON_DAYS || 7);
    const primaryPayments = items.map((item) => ({ ...item, ...getDeadlineMeta(item, dueSoonDays) }));

    return res.json({ ok: true, primaryPayments, dueSoonDays });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to load primary payments" });
  }
});

router.get("/primary/:invoiceNo", requireAuth, async (req, res) => {
  try {
    const { UserModel, WarehouseModel, PrimaryPaymentModel, SecondaryPaymentModel } = await getScopedPaymentModels(req, req.query?.companyId, req.query?.companyName);
    const primary = await PrimaryPaymentModel.findOne({ invoiceNo: req.params.invoiceNo }).lean();
    if (!primary) return res.status(404).json({ ok: false, message: "Primary invoice not found" });

    if (isDistributorUser(req.user)) {
      const scope = await resolveDistributorScope(req, UserModel);
      if (!scope.distributorObjectId || String(primary.distributorId) !== String(scope.distributorObjectId)) {
        return res.status(403).json({ ok: false, message: "Forbidden" });
      }
    }

    if (isWarehouseManagerUser(req.user)) {
      const scopedWarehouse = await ensureWarehouseManagerHasWarehouse(req, res, UserModel, WarehouseModel);
      if (!scopedWarehouse) return;
      if (String(primary.warehouseId) !== String(scopedWarehouse._id)) {
        return res.status(403).json({ ok: false, message: "Forbidden" });
      }
    }

    const settlements = await SecondaryPaymentModel.find({ primaryPaymentId: primary._id }).sort({ createdAt: -1 }).lean();
    const dueSoonDays = Number(process.env.PAYMENT_DUE_SOON_DAYS || 7);
    return res.json({ ok: true, primaryPayment: { ...primary, ...getDeadlineMeta(primary, dueSoonDays) }, settlements, dueSoonDays });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to load invoice details" });
  }
});

router.delete("/primary/:id", requireAuth, async (req, res) => {
  try {
    const { UserModel, WarehouseModel, PrimaryPaymentModel, SecondaryPaymentModel } = await getScopedPaymentModels(
      req,
      req.body?.companyId || req.query?.companyId,
      req.body?.companyName || req.query?.companyName
    );
    const primary = await PrimaryPaymentModel.findById(req.params.id).lean();
    if (!primary) return res.status(404).json({ ok: false, message: "Primary payment not found" });

    if (isDistributorUser(req.user)) {
      const scope = await resolveDistributorScope(req, UserModel);
      if (!scope.distributorObjectId || String(primary.distributorId) !== String(scope.distributorObjectId)) {
        return res.status(403).json({ ok: false, message: "Forbidden" });
      }
    }

    if (isWarehouseManagerUser(req.user)) {
      const scopedWarehouse = await ensureWarehouseManagerHasWarehouse(req, res, UserModel, WarehouseModel);
      if (!scopedWarehouse) return;
      if (String(primary.warehouseId) !== String(scopedWarehouse._id)) {
        return res.status(403).json({ ok: false, message: "Forbidden" });
      }
    }

    const linked = await SecondaryPaymentModel.exists({ primaryPaymentId: primary._id });
    if (linked) {
      return res.status(409).json({ ok: false, message: "Cannot delete primary payment with secondary settlements" });
    }

    await PrimaryPaymentModel.findByIdAndDelete(primary._id);
    return res.json({ ok: true });
  } catch (error) {
    return res.status(400).json({ ok: false, message: "Invalid primary payment id" });
  }
});

router.post("/secondary", requireAuth, async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { UserModel, WarehouseModel, PrimaryPaymentModel, SecondaryPaymentModel } = await getScopedPaymentModels(
      req,
      req.body?.companyId || req.query?.companyId,
      req.body?.companyName || req.query?.companyName
    );
    const body = req.body || {};
    const amountPaid = Number(body.amountPaid);
    if (!Number.isFinite(amountPaid) || amountPaid <= 0) {
      return res.status(400).json({ ok: false, message: "Amount paid must be greater than zero" });
    }

    let scopedWarehouseObjectId = null;
    let scopedDistributorObjectId = null;
    if (isWarehouseManagerUser(req.user)) {
      const scopedWarehouse = await ensureWarehouseManagerHasWarehouse(req, res, UserModel, WarehouseModel);
      if (!scopedWarehouse) return;
      scopedWarehouseObjectId = scopedWarehouse._id;
    }
    if (isDistributorUser(req.user)) {
      const scope = await resolveDistributorScope(req, UserModel);
      if (!scope.distributorObjectId) {
        return res.status(403).json({ ok: false, message: "Forbidden: distributor mapping missing" });
      }
      scopedDistributorObjectId = scope.distributorObjectId;
    }

    let createdSecondary = null;
    await session.withTransaction(async () => {
      const primary = await PrimaryPaymentModel.findOne({ invoiceNo: String(body.primaryInvoiceNo || "").trim() }).session(session);
      if (!primary) throw new Error("Primary invoice does not exist");

      const expectedWarehouseId = scopedWarehouseObjectId || toObjectId(body.warehouseId);
      if (!expectedWarehouseId) throw new Error("Warehouse is required");

      const expectedDistributorId = scopedDistributorObjectId || body.distributorId;
      if (String(primary.distributorId) !== String(expectedDistributorId) || String(primary.warehouseId) !== String(expectedWarehouseId)) {
        throw new Error("Distributor and warehouse must match the selected primary invoice");
      }

      if (amountPaid > Number(primary.amountRemaining || 0)) {
        throw new Error("Amount paid cannot be greater than remaining amount");
      }

      createdSecondary = await SecondaryPaymentModel.create(
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
    const { UserModel, WarehouseModel, SecondaryPaymentModel } = await getScopedPaymentModels(req, req.query?.companyId, req.query?.companyName);
    const query = {};
    const isDistributor = isDistributorUser(req.user);

    if (isDistributor) {
      const scope = await resolveDistributorScope(req, UserModel);
      if (!scope.distributorObjectId) {
        return res.status(403).json({ ok: false, message: "Forbidden: distributor mapping missing" });
      }
      query.distributorId = scope.distributorObjectId;
    }

    if (isWarehouseManagerUser(req.user)) {
      const scopedWarehouse = await ensureWarehouseManagerHasWarehouse(req, res, UserModel, WarehouseModel);
      if (!scopedWarehouse) return;
      query.warehouseId = scopedWarehouse._id;
    } else if (req.query.warehouseId || req.query.warehouse_id) {
      const warehouseId = toObjectId(req.query.warehouseId || req.query.warehouse_id);
      if (warehouseId) query.warehouseId = warehouseId;
    }

    const startDate = parseOptionalDate(req.query.start_date);
    const endDate = parseOptionalDate(req.query.end_date);
    if (startDate || endDate) {
      query.paidDate = {};
      if (startDate) query.paidDate.$gte = startOfDay(startDate);
      if (endDate) query.paidDate.$lte = endOfDay(endDate);
    }

    const rows = await SecondaryPaymentModel.find(query).sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, secondaryPayments: rows });
  } catch (error) {
    return res.status(500).json({ ok: false, message: "Failed to load secondary payments" });
  }
});

router.delete("/secondary/:id", requireAuth, async (req, res) => {
  const session = await mongoose.startSession();
  try {
    const { UserModel, WarehouseModel, PrimaryPaymentModel, SecondaryPaymentModel } = await getScopedPaymentModels(
      req,
      req.body?.companyId || req.query?.companyId,
      req.body?.companyName || req.query?.companyName
    );
    const scopedWarehouseObjectId = isWarehouseManagerUser(req.user)
      ? (await ensureWarehouseManagerHasWarehouse(req, res, UserModel, WarehouseModel))?._id
      : null;
    const scopedDistributorObjectId = isDistributorUser(req.user)
      ? (await resolveDistributorScope(req, UserModel))?.distributorObjectId
      : null;
    if (isWarehouseManagerUser(req.user) && !scopedWarehouseObjectId) return;
    if (isDistributorUser(req.user) && !scopedDistributorObjectId) {
      return res.status(403).json({ ok: false, message: "Forbidden: distributor mapping missing" });
    }

    await session.withTransaction(async () => {
      const secondary = await SecondaryPaymentModel.findById(req.params.id).session(session);
      if (!secondary) throw new Error("Secondary payment not found");

      if (scopedWarehouseObjectId && String(secondary.warehouseId) !== String(scopedWarehouseObjectId)) {
        throw new Error("Forbidden");
      }
      if (scopedDistributorObjectId && String(secondary.distributorId) !== String(scopedDistributorObjectId)) {
        throw new Error("Forbidden");
      }

      const primary = await PrimaryPaymentModel.findById(secondary.primaryPaymentId).session(session);
      if (!primary) throw new Error("Linked primary payment not found");

      if (scopedWarehouseObjectId && String(primary.warehouseId) !== String(scopedWarehouseObjectId)) {
        throw new Error("Forbidden");
      }
      if (scopedDistributorObjectId && String(primary.distributorId) !== String(scopedDistributorObjectId)) {
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
