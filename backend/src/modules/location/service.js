const mongoose = require("mongoose");
const Company = require("../../models/Company");
const User = require("../../models/User");
const { resolveTenantDbName, asText } = require("./tenant");
const { getLocationModelsForDb } = require("./models");
const { canViewTrackedUser, isSystemAdmin, toCanonicalTrackedRole, isTrackedRole } = require("./helpers/permissions");

function getUserModelForDb(db) {
  return db.models[User.modelName] || db.model(User.modelName, User.schema, User.collection.name);
}

async function getTenantDbByCompany(companyId, companyName = "") {
  const dbName = await resolveTenantDbName(companyId, companyName);
  if (!dbName) return null;
  return mongoose.connection.useDb(dbName, { useCache: true });
}

async function getViewerScopedDbs(viewer) {
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
  const db = await getTenantDbByCompany(companyId, viewer?.companyName || "");
  return db ? [{ db, companyId }] : [];
}

function toPoint(latitude, longitude) {
  return { type: "Point", coordinates: [longitude, latitude] };
}

async function startDuty(actor, payload) {
  const db = await getTenantDbByCompany(actor.companyId, actor.companyName);
  if (!db) return { status: 400, body: { ok: false, message: "Could not resolve tenant database" } };

  const { UserDutySession, UserLiveLocation, UserLocationHistory } = getLocationModelsForDb(db);

  const active = await UserDutySession.findOne({ userId: actor.userId, companyId: actor.companyId, isActive: true }).lean();
  if (active) {
    return { status: 409, body: { ok: false, message: "Active duty session already exists" } };
  }

  const startedAt = payload.startedAt;
  const point = toPoint(payload.latitude, payload.longitude);

  const session = await UserDutySession.create({
    userId: actor.userId,
    companyId: actor.companyId,
    distributorId: actor.distributorId,
    role: actor.role,
    startedAt,
    lastSeenAt: startedAt,
    isActive: true,
    startLocation: point,
  });

  const livePayload = {
    userId: actor.userId,
    companyId: actor.companyId,
    distributorId: actor.distributorId,
    role: actor.role,
    latitude: payload.latitude,
    longitude: payload.longitude,
    location: point,
    recordedAt: startedAt,
    lastSeenAt: startedAt,
    dutySessionId: String(session._id),
    source: payload.source,
  };

  await UserLiveLocation.findOneAndUpdate(
    { userId: actor.userId, companyId: actor.companyId },
    { $set: livePayload },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await UserLocationHistory.create(livePayload);

  return { status: 200, body: { ok: true, data: { dutySessionId: session._id, startedAt } } };
}

async function updateLocation(actor, points) {
  const db = await getTenantDbByCompany(actor.companyId, actor.companyName);
  if (!db) return { status: 400, body: { ok: false, message: "Could not resolve tenant database" } };

  const { UserDutySession, UserLiveLocation, UserLocationHistory } = getLocationModelsForDb(db);

  const activeSession = await UserDutySession.findOne({ userId: actor.userId, companyId: actor.companyId, isActive: true });
  if (!activeSession) {
    return { status: 400, body: { ok: false, message: "No active duty session. Start duty first." } };
  }

  const historyDocs = points.map((point) => ({
    userId: actor.userId,
    companyId: actor.companyId,
    distributorId: actor.distributorId,
    role: actor.role,
    latitude: point.latitude,
    longitude: point.longitude,
    location: toPoint(point.latitude, point.longitude),
    recordedAt: point.recordedAt,
    lastSeenAt: point.recordedAt,
    dutySessionId: String(activeSession._id),
    source: point.source,
  }));

  await UserLocationHistory.insertMany(historyDocs, { ordered: true });

  const lastPoint = historyDocs[historyDocs.length - 1];
  await UserLiveLocation.findOneAndUpdate(
    { userId: actor.userId, companyId: actor.companyId },
    {
      $set: {
        ...lastPoint,
        recordedAt: lastPoint.recordedAt,
        lastSeenAt: lastPoint.recordedAt,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  activeSession.lastSeenAt = lastPoint.recordedAt;
  await activeSession.save();

  return {
    status: 200,
    body: {
      ok: true,
      data: {
        dutySessionId: activeSession._id,
        acceptedPoints: points.length,
        lastRecordedAt: lastPoint.recordedAt,
      },
    },
  };
}

async function endDuty(actor, payload) {
  const db = await getTenantDbByCompany(actor.companyId, actor.companyName);
  if (!db) return { status: 400, body: { ok: false, message: "Could not resolve tenant database" } };

  const { UserDutySession, UserLiveLocation, UserLocationHistory } = getLocationModelsForDb(db);

  const activeSession = await UserDutySession.findOne({ userId: actor.userId, companyId: actor.companyId, isActive: true });
  if (!activeSession) {
    return { status: 400, body: { ok: false, message: "No active duty session found" } };
  }

  const point = toPoint(payload.latitude, payload.longitude);
  activeSession.isActive = false;
  activeSession.endedAt = payload.endedAt;
  activeSession.lastSeenAt = payload.endedAt;
  activeSession.endLocation = point;
  await activeSession.save();

  const livePayload = {
    userId: actor.userId,
    companyId: actor.companyId,
    distributorId: actor.distributorId,
    role: actor.role,
    latitude: payload.latitude,
    longitude: payload.longitude,
    location: point,
    recordedAt: payload.endedAt,
    lastSeenAt: payload.endedAt,
    dutySessionId: String(activeSession._id),
    source: payload.source,
  };

  await UserLiveLocation.findOneAndUpdate(
    { userId: actor.userId, companyId: actor.companyId },
    { $set: livePayload },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await UserLocationHistory.create(livePayload);

  return { status: 200, body: { ok: true, data: { dutySessionId: activeSession._id, endedAt: payload.endedAt } } };
}

function createTrackedSnapshot(userDoc, locationDoc) {
  return {
    userId: locationDoc.userId,
    fullName: userDoc?.fullName || "",
    role: userDoc?.role || locationDoc.role,
    companyId: locationDoc.companyId,
    distributorId: locationDoc.distributorId,
    latitude: locationDoc.latitude,
    longitude: locationDoc.longitude,
    recordedAt: locationDoc.recordedAt,
    lastSeenAt: locationDoc.lastSeenAt,
    dutySessionId: locationDoc.dutySessionId || "",
  };
}

async function listLiveUsers(viewer) {
  const scopedDbs = await getViewerScopedDbs(viewer);
  const items = [];

  for (const { db } of scopedDbs) {
    const { UserLiveLocation } = getLocationModelsForDb(db);
    const UserModel = getUserModelForDb(db);

    const [liveDocs, trackedUsers] = await Promise.all([
      UserLiveLocation.find({}).sort({ lastSeenAt: -1 }).lean(),
      UserModel.find({ role: { $in: ["Supplier", "Salesman", "Order Booker"] } })
        .select("userId fullName role companyId distributorId")
        .lean(),
    ]);

    const userMap = new Map(trackedUsers.map((u) => [String(u.userId || u._id), u]));

    for (const live of liveDocs) {
      const tracked = userMap.get(String(live.userId)) || {
        userId: live.userId,
        role: live.role,
        companyId: live.companyId,
        distributorId: live.distributorId,
      };

      if (!isTrackedRole(toCanonicalTrackedRole(tracked.role))) continue;
      if (!canViewTrackedUser(viewer, tracked)) continue;

      items.push(createTrackedSnapshot(tracked, live));
    }
  }

  return { status: 200, body: { ok: true, data: { items } } };
}

async function findAuthorizedTrackedUser(viewer, userId) {
  const scopedDbs = await getViewerScopedDbs(viewer);

  for (const { db } of scopedDbs) {
    const UserModel = getUserModelForDb(db);
    const tracked = await UserModel.findOne({ userId }).select("userId fullName role companyId distributorId").lean();
    if (!tracked) continue;

    if (!isTrackedRole(toCanonicalTrackedRole(tracked.role))) return { unauthorized: true };
    if (!canViewTrackedUser(viewer, tracked)) return { unauthorized: true };

    return { db, tracked };
  }

  return null;
}

async function getLiveUser(viewer, userId) {
  const found = await findAuthorizedTrackedUser(viewer, userId);
  if (!found || found.unauthorized) return { status: 404, body: { ok: false, message: "User not found" } };

  const { UserLiveLocation } = getLocationModelsForDb(found.db);
  const live = await UserLiveLocation.findOne({ userId: found.tracked.userId }).lean();
  if (!live) return { status: 404, body: { ok: false, message: "Live location not found" } };

  return { status: 200, body: { ok: true, data: createTrackedSnapshot(found.tracked, live) } };
}

async function getHistory(viewer, userId) {
  const found = await findAuthorizedTrackedUser(viewer, userId);
  if (!found || found.unauthorized) return { status: 404, body: { ok: false, message: "User not found" } };

  const { UserLocationHistory } = getLocationModelsForDb(found.db);
  const points = await UserLocationHistory.find({ userId: found.tracked.userId }).sort({ recordedAt: -1 }).limit(1000).lean();
  return { status: 200, body: { ok: true, data: { userId: found.tracked.userId, points } } };
}

async function getDutySessions(viewer, userId) {
  const found = await findAuthorizedTrackedUser(viewer, userId);
  if (!found || found.unauthorized) return { status: 404, body: { ok: false, message: "User not found" } };

  const { UserDutySession } = getLocationModelsForDb(found.db);
  const sessions = await UserDutySession.find({ userId: found.tracked.userId }).sort({ startedAt: -1 }).limit(365).lean();
  return { status: 200, body: { ok: true, data: { userId: found.tracked.userId, sessions } } };
}

async function getSummary(viewer, userId) {
  const found = await findAuthorizedTrackedUser(viewer, userId);
  if (!found || found.unauthorized) return { status: 404, body: { ok: false, message: "User not found" } };

  const { UserDutySession, UserLocationHistory, UserLiveLocation } = getLocationModelsForDb(found.db);
  const [sessionCount, activeSession, pointCount, lastPoint] = await Promise.all([
    UserDutySession.countDocuments({ userId: found.tracked.userId }),
    UserDutySession.findOne({ userId: found.tracked.userId, isActive: true }).lean(),
    UserLocationHistory.countDocuments({ userId: found.tracked.userId }),
    UserLiveLocation.findOne({ userId: found.tracked.userId }).lean(),
  ]);

  return {
    status: 200,
    body: {
      ok: true,
      data: {
        userId: found.tracked.userId,
        role: found.tracked.role,
        fullName: found.tracked.fullName || "",
        totalSessions: sessionCount,
        totalLocationPoints: pointCount,
        hasActiveDuty: Boolean(activeSession),
        activeDutySessionId: activeSession ? String(activeSession._id) : "",
        lastSeenAt: lastPoint?.lastSeenAt || null,
      },
    },
  };
}

module.exports = {
  startDuty,
  updateLocation,
  endDuty,
  listLiveUsers,
  getLiveUser,
  getHistory,
  getDutySessions,
  getSummary,
};