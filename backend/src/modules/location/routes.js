const express = require("express");
const mongoose = require("mongoose");
const { requireAuth } = require("../../utils/auth");
const User = require("../../models/User");
const Company = require("../../models/Company");
const { resolveTenantDbName, asText } = require("./tenant");
const { getLocationModelsForDb } = require("./models");
const { canViewTrackedUser, isSystemAdmin, toCanonicalTrackedRole, isTrackedRole } = require("./helpers/permissions");

const router = express.Router();

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function getUserModelForDb(db) {
  return db.models[User.modelName] || db.model(User.modelName, User.schema, User.collection.name);
}

async function getTenantDbByCompany(companyId, companyName) {
  const dbName = await resolveTenantDbName(companyId, companyName);
  if (!dbName) return null;
  return mongoose.connection.useDb(dbName, { useCache: true });
}

async function listScopedTenantDbsForViewer(viewer) {
  if (isSystemAdmin(viewer?.role)) {
    const companies = await Company.find({}).select("companyId name").lean();
    const dbs = [];
    for (const company of companies) {
      const db = await getTenantDbByCompany(company.companyId, company.name);
      if (db) dbs.push({ db, companyId: asText(company.companyId) });
    }
    return dbs;
  }

  const companyId = asText(viewer?.companyId);
  if (!companyId) return [];
  const db = await getTenantDbByCompany(companyId, viewer?.companyName);
  return db ? [{ db, companyId }] : [];
}

router.post("/live/ping", requireAuth, async (req, res) => {
  try {
    const latitude = toNumber(req.body?.latitude);
    const longitude = toNumber(req.body?.longitude);

    if (latitude === null || longitude === null) {
      return res.status(400).json({ ok: false, message: "Invalid coordinates" });
    }

    const role = toCanonicalTrackedRole(req.user?.role);
    if (!isTrackedRole(role)) {
      return res.status(403).json({ ok: false, message: "Role is not enabled for tracking" });
    }

    const companyId = asText(req.user?.companyId);
    if (!companyId) {
      return res.status(400).json({ ok: false, message: "Missing company scope" });
    }

    const tenantDb = await getTenantDbByCompany(companyId, req.user?.companyName);
    if (!tenantDb) {
      return res.status(400).json({ ok: false, message: "Could not resolve tenant database" });
    }

    const { UserLiveLocation, UserLocationHistory, UserDutySession } = getLocationModelsForDb(tenantDb);
    const now = new Date();
    const basePayload = {
      userId: asText(req.user?.userId || req.user?.uid),
      companyId,
      distributorId: asText(req.user?.distributorId),
      role,
      latitude,
      longitude,
      location: { type: "Point", coordinates: [longitude, latitude] },
      recordedAt: now,
      lastSeenAt: now,
      source: asText(req.body?.source || "mobile"),
    };

    await UserLiveLocation.findOneAndUpdate(
      { userId: basePayload.userId, companyId: basePayload.companyId },
      { $set: basePayload },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await UserLocationHistory.create(basePayload);

    await UserDutySession.findOneAndUpdate(
      { userId: basePayload.userId, companyId: basePayload.companyId, isActive: true },
      {
        $setOnInsert: {
          startedAt: now,
          startLocation: basePayload.location,
          distributorId: basePayload.distributorId,
          role: basePayload.role,
        },
        $set: { lastSeenAt: now },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.json({ ok: true, recordedAt: now.toISOString() });
  } catch (_error) {
    return res.status(500).json({ ok: false, message: "Failed to record location" });
  }
});

router.get("/live", requireAuth, async (req, res) => {
  try {
    const tenantDbs = await listScopedTenantDbsForViewer(req.user);
    if (!tenantDbs.length) return res.json({ ok: true, items: [] });

    const items = [];
    for (const { db } of tenantDbs) {
      const { UserLiveLocation } = getLocationModelsForDb(db);
      const UserModel = getUserModelForDb(db);

      const [locations, users] = await Promise.all([
        UserLiveLocation.find({}).sort({ lastSeenAt: -1 }).lean(),
        UserModel.find({ role: { $in: ["Supplier", "Salesman", "Order Booker"] } })
          .select("userId fullName role companyId distributorId")
          .lean(),
      ]);

      const userByUserId = new Map(users.map((user) => [String(user.userId || user._id), user]));

      for (const location of locations) {
        const trackedUser = userByUserId.get(String(location.userId)) || {
          userId: location.userId,
          role: location.role,
          companyId: location.companyId,
          distributorId: location.distributorId,
        };

        if (!canViewTrackedUser(req.user, trackedUser)) continue;

        items.push({
          userId: location.userId,
          role: trackedUser.role || location.role,
          companyId: location.companyId,
          distributorId: location.distributorId,
          fullName: trackedUser.fullName || "",
          latitude: location.latitude,
          longitude: location.longitude,
          recordedAt: location.recordedAt,
          lastSeenAt: location.lastSeenAt,
        });
      }
    }

    return res.json({ ok: true, items });
  } catch (_error) {
    return res.status(500).json({ ok: false, message: "Failed to load tracked users" });
  }
});

module.exports = router;
