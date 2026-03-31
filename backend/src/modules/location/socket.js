const { verifyToken } = require("../../utils/auth");
const { toCanonicalTrackedRole, isSystemAdmin, isCompanyAdmin, normalizeRole } = require("./helpers/permissions");

let io = null;
const recentEventKeys = new Map();
const EVENT_DEDUP_WINDOW_MS = 1500;

function cleanupRecentKeys() {
  const now = Date.now();
  for (const [key, ts] of recentEventKeys.entries()) {
    if (now - ts > EVENT_DEDUP_WINDOW_MS) recentEventKeys.delete(key);
  }
}

function isSalesOrOrderbooker(role) {
  const canonical = toCanonicalTrackedRole(role);
  return canonical === "salesman" || canonical === "orderbooker";
}

function emitToRooms(eventName, payload) {
  if (!io) return;

  cleanupRecentKeys();
  const signature = `${eventName}:${payload.userId}:${payload.recordedAt || payload.lastSeenAt || ""}`;
  if (recentEventKeys.has(signature)) return;
  recentEventKeys.set(signature, Date.now());

  io.to("system_admins").emit(eventName, payload);
  io.to(`company_${payload.companyId}`).emit(eventName, payload);

  if (payload.distributorId && isSalesOrOrderbooker(payload.role)) {
    io.to(`distributor_${payload.distributorId}`).emit(eventName, payload);
  }
}

function buildPayload(data) {
  return {
    userId: String(data.userId || ""),
    fullName: String(data.fullName || ""),
    role: String(data.role || ""),
    companyId: String(data.companyId || ""),
    distributorId: String(data.distributorId || ""),
    latitude: Number(data.latitude),
    longitude: Number(data.longitude),
    recordedAt: data.recordedAt ? new Date(data.recordedAt).toISOString() : null,
    lastSeenAt: data.lastSeenAt ? new Date(data.lastSeenAt).toISOString() : null,
    dutySessionId: String(data.dutySessionId || ""),
  };
}

function emitLocationUserUpdated(data) {
  emitToRooms("location:user-updated", buildPayload(data));
}

function emitLocationUserStopped(data) {
  emitToRooms("location:user-stopped", buildPayload(data));
}

function emitLocationUserOffline(data) {
  emitToRooms("location:user-offline", buildPayload(data));
}

function registerLocationSocket(socketServer) {
  io = socketServer;
  if (!io) return;

  io.use((socket, next) => {
    try {
      const authToken = socket.handshake?.auth?.token || socket.handshake?.query?.token || "";
      const token = String(authToken || "").replace(/^Bearer\s+/i, "").trim();
      if (!token) return next(new Error("Unauthorized"));
      socket.user = verifyToken(token);
      return next();
    } catch (_error) {
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const user = socket.user || {};
    const role = normalizeRole(user.role);

    if (isSystemAdmin(role)) {
      socket.join("system_admins");
    }

    const companyId = String(user.companyId || "").trim();
    if (companyId && isCompanyAdmin(role)) {
      socket.join(`company_${companyId}`);
    }

    if (role === "distributor") {
      const distributorId = String(user.distributorId || user.uid || user.userId || "").trim();
      if (distributorId) socket.join(`distributor_${distributorId}`);
    }
  });
}

module.exports = {
  registerLocationSocket,
  emitLocationUserUpdated,
  emitLocationUserStopped,
  emitLocationUserOffline,
};
