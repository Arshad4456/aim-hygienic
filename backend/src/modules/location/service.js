const mongoose = require("mongoose");
const Company = require("../../models/Company");
const User = require("../../models/User");
const { resolveTenantDbName, asText } = require("./tenant");
const { getLocationModelsForDb } = require("./models");
const { canViewTrackedUser, isSystemAdmin, toCanonicalTrackedRole, isTrackedRole, isCompanyAdmin } = require("./helpers/permissions");
const {
  emitLocationUserUpdated,
  emitLocationUserStopped,
  emitLocationUserOffline,
} = require("./socket");

const OFFLINE_THRESHOLD_MINUTES = 15;

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

function toPointHash(point) {
  const lat = Number(point.latitude).toFixed(6);
  const lng = Number(point.longitude).toFixed(6);
  const ts = new Date(point.recordedAt || Date.now()).toISOString();
  return `${lat}:${lng}:${ts}`;
}

function deriveTrackingStatus(lastSeenAt) {
  const ts = new Date(lastSeenAt || 0).getTime();
  if (!Number.isFinite(ts) || ts <= 0) return "unknown";
  const ageMin = (Date.now() - ts) / 60000;
  if (ageMin <= 5) return "online";
  if (ageMin <= OFFLINE_THRESHOLD_MINUTES) return "idle";
  return "offline";
}

function isDistributor(viewer) {
  return toCanonicalTrackedRole(viewer?.role) === "distributor" || String(viewer?.role || "").trim().toLowerCase() === "distributor";
}

function normalizeAndDeduplicateIncomingPoints(points, activeSession) {
  const sorted = [...points].sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
  const deduped = [];
  const seenHashes = new Set();
  const sessionLastSeenTs = new Date(activeSession?.lastSeenAt || 0).getTime();

  for (const point of sorted) {
    const hash = toPointHash(point);
    if (seenHashes.has(hash)) continue;

    const ts = new Date(point.recordedAt).getTime();
    if (Number.isFinite(sessionLastSeenTs) && sessionLastSeenTs > 0 && ts <= sessionLastSeenTs) continue;

    seenHashes.add(hash);
    deduped.push({ ...point, pointHash: hash });
  }

  return deduped;
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
    source: payload.source,
    startLocation: point,
  });

  const livePayload = {
    userId: actor.userId,
    companyId: actor.companyId,
    distributorId: actor.distributorId,
    role: actor.role,
    latitude: payload.latitude,
    longitude: payload.longitude,
    accuracy: payload.accuracy ?? null,
    speed: payload.speed ?? null,
    heading: payload.heading ?? null,
    altitude: payload.altitude ?? null,
    location: point,
    recordedAt: startedAt,
    lastSeenAt: startedAt,
    dutySessionId: String(session._id),
    source: payload.source,
    pointHash: toPointHash({ latitude: payload.latitude, longitude: payload.longitude, recordedAt: startedAt }),
  };

  await UserLiveLocation.findOneAndUpdate(
    { userId: actor.userId, companyId: actor.companyId },
    { $set: livePayload },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await UserLocationHistory.updateOne(
    {
      companyId: actor.companyId,
      userId: actor.userId,
      dutySessionId: livePayload.dutySessionId,
      pointHash: livePayload.pointHash,
    },
    { $setOnInsert: livePayload },
    { upsert: true }
  );

  emitLocationUserUpdated({ ...livePayload, trackingStatus: "online" });

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

  const normalizedPoints = normalizeAndDeduplicateIncomingPoints(points, activeSession);
  if (!normalizedPoints.length) {
    return {
      status: 200,
      body: {
        ok: true,
        data: {
          dutySessionId: activeSession._id,
          acceptedPoints: 0,
          skippedDuplicates: points.length,
          lastRecordedAt: activeSession.lastSeenAt,
        },
      },
    };
  }

  const historyDocs = normalizedPoints.map((point) => ({
    userId: actor.userId,
    companyId: actor.companyId,
    distributorId: actor.distributorId,
    role: actor.role,
    latitude: point.latitude,
    longitude: point.longitude,
    accuracy: point.accuracy ?? null,
    speed: point.speed ?? null,
    heading: point.heading ?? null,
    altitude: point.altitude ?? null,
    location: toPoint(point.latitude, point.longitude),
    recordedAt: point.recordedAt,
    lastSeenAt: point.recordedAt,
    dutySessionId: String(activeSession._id),
    pointHash: point.pointHash,
    source: point.source,
  }));

  try {
    await UserLocationHistory.insertMany(historyDocs, { ordered: false });
  } catch (_error) {
    // duplicates are tolerated due unique dedupe index
  }

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

  emitLocationUserUpdated({ ...lastPoint, trackingStatus: "online" });

  return {
    status: 200,
    body: {
      ok: true,
      data: {
        dutySessionId: activeSession._id,
        acceptedPoints: historyDocs.length,
        skippedDuplicates: points.length - historyDocs.length,
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
    accuracy: payload.accuracy ?? null,
    speed: payload.speed ?? null,
    heading: payload.heading ?? null,
    altitude: payload.altitude ?? null,
    location: point,
    recordedAt: payload.endedAt,
    lastSeenAt: payload.endedAt,
    dutySessionId: String(activeSession._id),
    pointHash: toPointHash({ latitude: payload.latitude, longitude: payload.longitude, recordedAt: payload.endedAt }),
    source: payload.source,
  };

  await UserLiveLocation.findOneAndUpdate(
    { userId: actor.userId, companyId: actor.companyId },
    { $set: livePayload },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await UserLocationHistory.updateOne(
    {
      companyId: actor.companyId,
      userId: actor.userId,
      dutySessionId: livePayload.dutySessionId,
      pointHash: livePayload.pointHash,
    },
    { $setOnInsert: livePayload },
    { upsert: true }
  );

  const stoppedPayload = { ...livePayload, trackingStatus: "offline" };
  emitLocationUserStopped(stoppedPayload);
  emitLocationUserOffline(stoppedPayload);

  return { status: 200, body: { ok: true, data: { dutySessionId: activeSession._id, endedAt: payload.endedAt } } };
}

function createTrackedSnapshot(userDoc, locationDoc) {
  const lastSeenAt = locationDoc.lastSeenAt || locationDoc.recordedAt || null;
  return {
    userId: locationDoc.userId,
    fullName: userDoc?.fullName || "",
    role: userDoc?.role || locationDoc.role,
    companyId: locationDoc.companyId,
    distributorId: locationDoc.distributorId,
    regionName: userDoc?.regionName || "",
    zoneName: userDoc?.zoneName || "",
    territoryName: userDoc?.territoryName || "",
    fieldName: userDoc?.fieldName || "",
    latitude: locationDoc.latitude,
    longitude: locationDoc.longitude,
    accuracy: locationDoc.accuracy ?? null,
    speed: locationDoc.speed ?? null,
    heading: locationDoc.heading ?? null,
    altitude: locationDoc.altitude ?? null,
    recordedAt: locationDoc.recordedAt,
    lastSeenAt,
    trackingStatus: deriveTrackingStatus(lastSeenAt),
    dutySessionId: locationDoc.dutySessionId || "",
  };
}

function getLiveQueryForViewer(viewer) {
  if (isDistributor(viewer)) {
    const distributorIds = [...new Set([
      asText(viewer?.distributorId),
      asText(viewer?.userId),
      asText(viewer?.uid),
      asText(viewer?._id),
    ].filter(Boolean))];

    return {
      distributorId: distributorIds.length > 1 ? { $in: distributorIds } : distributorIds[0] || "",
      role: { $in: ["salesman", "orderbooker", "Salesman", "Order Booker"] },
    };
  }

  if (isSystemAdmin(viewer?.role) || isCompanyAdmin(viewer?.role)) {
    return {};
  }

  return { _id: { $exists: false } };
}

async function listLiveUsers(viewer) {
  const scopedDbs = await getViewerScopedDbs(viewer);
  const items = [];

  for (const { db } of scopedDbs) {
    const { UserLiveLocation } = getLocationModelsForDb(db);
    const UserModel = getUserModelForDb(db);

    const liveQuery = getLiveQueryForViewer(viewer);
    const liveDocs = await UserLiveLocation.find(liveQuery)
      .sort({ lastSeenAt: -1 })
      .limit(2500)
      .select("userId companyId distributorId role latitude longitude accuracy speed heading altitude recordedAt lastSeenAt dutySessionId")
      .lean();

    const userIds = [...new Set(liveDocs.map((doc) => String(doc.userId || "")).filter(Boolean))];
    const trackedUsers = userIds.length
      ? await UserModel.find({ userId: { $in: userIds } })
          .select("userId fullName role companyId distributorId regionName zoneName territoryName fieldName")
          .lean()
      : [];

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

  items.sort((a, b) => new Date(b.lastSeenAt || 0).getTime() - new Date(a.lastSeenAt || 0).getTime());

  return {
    status: 200,
    body: {
      ok: true,
      data: {
        items,
        total: items.length,
      },
    },
  };
}

async function findAuthorizedTrackedUser(viewer, userId) {
  const scopedDbs = await getViewerScopedDbs(viewer);

  for (const { db } of scopedDbs) {
    const UserModel = getUserModelForDb(db);
    const tracked = await UserModel.findOne({ userId }).select("userId fullName role companyId distributorId regionName zoneName territoryName fieldName").lean();
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
  const points = await UserLocationHistory.find({ userId: found.tracked.userId })
    .sort({ recordedAt: -1 })
    .limit(1000)
    .select("userId latitude longitude accuracy speed heading altitude source recordedAt lastSeenAt dutySessionId")
    .lean();
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
        trackingStatus: deriveTrackingStatus(lastPoint?.lastSeenAt || null),
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