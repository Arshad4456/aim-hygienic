const { toCanonicalTrackedRole, isTrackedRole } = require("./helpers/permissions");

function isFiniteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function parseCoordinatePair(payload) {
  const latitude = isFiniteNumber(payload?.latitude);
  const longitude = isFiniteNumber(payload?.longitude);

  if (latitude === null || longitude === null) return { ok: false, message: "Invalid coordinates" };
  if (latitude < -90 || latitude > 90) return { ok: false, message: "Latitude out of range" };
  if (longitude < -180 || longitude > 180) return { ok: false, message: "Longitude out of range" };

  return { ok: true, value: { latitude, longitude } };
}

function parseTimestamp(value, fieldName, fallbackNow = false) {
  const now = Date.now();
  if (value === undefined || value === null || value === "") {
    return fallbackNow ? { ok: true, value: new Date() } : { ok: false, message: `${fieldName} is required` };
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { ok: false, message: `${fieldName} must be a valid timestamp` };
  }

  const maxFutureMs = 5 * 60 * 1000;
  if (date.getTime() - now > maxFutureMs) {
    return { ok: false, message: `${fieldName} cannot be in the far future` };
  }

  const maxPastMs = 30 * 24 * 60 * 60 * 1000;
  if (now - date.getTime() > maxPastMs) {
    return { ok: false, message: `${fieldName} is too old` };
  }

  return { ok: true, value: date };
}

function normalizeSource(value) {
  return String(value || "mobile").trim() || "mobile";
}

function normalizeUserId(value) {
  return String(value || "").trim();
}

function validateTrackedActor(req, res, next) {
  const canonicalRole = toCanonicalTrackedRole(req.user?.role);
  if (!isTrackedRole(canonicalRole)) {
    return res.status(403).json({ ok: false, message: "Role is not enabled for tracking" });
  }

  const userId = normalizeUserId(req.user?.userId || req.user?.uid);
  const companyId = normalizeUserId(req.user?.companyId);
  if (!userId || !companyId) {
    return res.status(400).json({ ok: false, message: "Missing user/company scope in token" });
  }

  req.trackingActor = {
    userId,
    role: canonicalRole,
    companyId,
    distributorId: normalizeUserId(req.user?.distributorId),
    companyName: String(req.user?.companyName || "").trim(),
  };
  next();
}

function validateStartDuty(req, res, next) {
  const coord = parseCoordinatePair(req.body || {});
  if (!coord.ok) return res.status(400).json({ ok: false, message: coord.message });

  const ts = parseTimestamp(req.body?.startedAt, "startedAt", true);
  if (!ts.ok) return res.status(400).json({ ok: false, message: ts.message });

  req.validatedBody = {
    ...coord.value,
    startedAt: ts.value,
    source: normalizeSource(req.body?.source),
  };
  next();
}

function validateUpdate(req, res, next) {
  const points = Array.isArray(req.body?.points) ? req.body.points : null;
  if (!points || points.length === 0) {
    return res.status(400).json({ ok: false, message: "points array is required" });
  }
  if (points.length > 500) {
    return res.status(400).json({ ok: false, message: "points array exceeds maximum size of 500" });
  }

  const normalizedPoints = [];
  for (let i = 0; i < points.length; i += 1) {
    const point = points[i] || {};
    const coord = parseCoordinatePair(point);
    if (!coord.ok) return res.status(400).json({ ok: false, message: `points[${i}]: ${coord.message}` });

    const ts = parseTimestamp(point.recordedAt, "recordedAt", true);
    if (!ts.ok) return res.status(400).json({ ok: false, message: `points[${i}]: ${ts.message}` });

    normalizedPoints.push({
      ...coord.value,
      recordedAt: ts.value,
      source: normalizeSource(point.source),
    });
  }

  req.validatedBody = { points: normalizedPoints };
  next();
}

function validateEndDuty(req, res, next) {
  const coord = parseCoordinatePair(req.body || {});
  if (!coord.ok) return res.status(400).json({ ok: false, message: coord.message });

  const ts = parseTimestamp(req.body?.endedAt, "endedAt", true);
  if (!ts.ok) return res.status(400).json({ ok: false, message: ts.message });

  req.validatedBody = {
    ...coord.value,
    endedAt: ts.value,
    source: normalizeSource(req.body?.source),
  };
  next();
}

function validateUserIdParam(req, res, next) {
  const userId = normalizeUserId(req.params?.userId);
  if (!userId) return res.status(400).json({ ok: false, message: "userId is required" });
  req.validatedParams = { userId };
  next();
}

module.exports = {
  validateTrackedActor,
  validateStartDuty,
  validateUpdate,
  validateEndDuty,
  validateUserIdParam,
};
