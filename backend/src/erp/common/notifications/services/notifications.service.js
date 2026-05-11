const Notification = require("../models/notification.model");
const Message = require("../../messaging/models/Message");
const { asText, normalizeRole, isSystemLevelAdmin, getScopedModels } = require("../../../platform/tenancy/services/scopedModels");
const { CHANNELS, EVENT_TEMPLATES } = require("../utils/notifications.constants");
const { deliverChannel } = require("./notifications.providers");

function normalizeChannel(value) {
  const safe = asText(value).toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
  return CHANNELS.includes(safe) ? safe : "in_app";
}

function normalizeChannels(channels) {
  const input = Array.isArray(channels) ? channels : String(channels || "in_app").split(",");
  const normalized = input.map(normalizeChannel).filter(Boolean);
  return [...new Set(normalized.length ? normalized : ["in_app"])];
}

function roleAliases(user = {}) {
  return [...new Set([
    asText(user.role),
    asText(user.roleKey),
    asText(user.portalType),
    asText(user.role || "").replace(/\s+/g, "_"),
    asText(user.role || "").replace(/_/g, " "),
  ].filter(Boolean))];
}

function uidAliases(user = {}) {
  return [...new Set([
    asText(user.uid),
    asText(user._id),
    asText(user.userId),
  ].filter(Boolean))];
}

function companyIdFrom(req, payload = {}) {
  return asText(payload.companyId || req.body?.companyId || req.query?.companyId || req.user?.companyId);
}

function companyNameFrom(req, payload = {}) {
  return asText(payload.companyName || req.body?.companyName || req.query?.companyName || req.user?.companyName);
}

async function scoped(req) {
  return getScopedModels(req, {
    NotificationModel: Notification,
    MessageModel: Message,
  });
}

function buildVisibilityQuery(req, filters = {}) {
  const query = {};
  const user = req.user || {};
  const companyId = companyIdFrom(req, filters);
  const userRole = normalizeRole(user.role);
  const admin = isSystemLevelAdmin(user.role) || userRole === "company admin" || userRole === "super admin";

  if (companyId) query.companyId = companyId;
  if (filters.module) query.module = asText(filters.module);
  if (filters.eventType) query.eventType = asText(filters.eventType);
  if (filters.priority) query.priority = asText(filters.priority);
  if (filters.status) query.status = asText(filters.status);

  if (!admin) {
    const roles = roleAliases(user);
    const userIds = uidAliases(user);
    query.$or = [
      { audience: "all" },
      { recipientRole: { $in: roles } },
      { recipientUserId: { $in: userIds } },
      { recipientUserId: { $exists: false } },
      { recipientUserId: "" },
    ];
  } else {
    if (filters.recipientRole) query.recipientRole = asText(filters.recipientRole);
    if (filters.recipientUserId) query.recipientUserId = asText(filters.recipientUserId);
  }

  if (String(filters.unreadOnly || "") === "1") {
    const ids = uidAliases(user);
    if (ids.length) query.readByUserIds = { $nin: ids };
  }

  return query;
}

function inferAudience(payload = {}) {
  if (asText(payload.recipientUserId)) return "user";
  if (asText(payload.recipientMobile) || asText(payload.recipientEmail)) return "external";
  if (asText(payload.recipientRole)) return "role";
  return asText(payload.audience) || "all";
}

function normalizeStatus(channelStatuses = []) {
  if (!channelStatuses.length) return "queued";
  const statuses = channelStatuses.map((item) => item.status);
  if (statuses.every((status) => status === "sent")) return "sent";
  if (statuses.some((status) => status === "sent" || status === "queued")) return "partial";
  if (statuses.every((status) => status === "failed")) return "failed";
  return "queued";
}

function mapReadState(row = {}, req) {
  const ids = uidAliases(req.user || {});
  const readBy = Array.isArray(row.readByUserIds) ? row.readByUserIds.map(String) : [];
  const isRead = ids.some((id) => readBy.includes(id)) || Boolean(row.readAt && row.recipientUserId && ids.includes(String(row.recipientUserId)));
  return { ...row, isRead, readStatus: isRead ? "read" : "unread" };
}

async function createLegacyMessage(MessageModel, notification, req) {
  try {
    if (!notification.channels?.includes("in_app")) return null;
    return await MessageModel.create({
      title: notification.title,
      body: notification.body,
      type: notification.eventType || notification.module || "notification",
      priority: notification.priority || "normal",
      senderUserId: asText(req.user?.uid),
      senderName: asText(req.user?.username || req.user?.fullName || notification.createdByName),
      senderRole: asText(req.user?.role),
      recipientRole: asText(notification.recipientRole),
      relatedEntity: asText(notification.relatedEntity),
    });
  } catch (_error) {
    return null;
  }
}

async function create(req, payload = {}) {
  const { NotificationModel, MessageModel } = await scoped(req);
  const channels = normalizeChannels(payload.channels);
  const companyId = companyIdFrom(req, payload);
  const companyName = companyNameFrom(req, payload);
  const title = asText(payload.title || payload.subject);
  const body = asText(payload.body || payload.message || payload.description);

  if (!title) throw new Error("Notification title is required.");
  if (!body) throw new Error("Notification body is required.");

  let notification = await NotificationModel.create({
    companyId,
    companyName,
    title,
    body,
    module: asText(payload.module || "general"),
    eventType: asText(payload.eventType || "manual"),
    relatedEntity: asText(payload.relatedEntity),
    priority: asText(payload.priority || "normal").toLowerCase(),
    audience: inferAudience(payload),
    recipientUserId: asText(payload.recipientUserId),
    recipientRole: asText(payload.recipientRole),
    recipientName: asText(payload.recipientName),
    recipientMobile: asText(payload.recipientMobile),
    recipientEmail: asText(payload.recipientEmail),
    channels,
    status: "queued",
    createdByUserId: asText(req.user?.uid),
    createdByName: asText(req.user?.username || req.user?.fullName || req.user?.role),
    scheduledFor: payload.scheduledFor || undefined,
    metadata: payload.metadata && typeof payload.metadata === "object" ? payload.metadata : {},
  });

  const channelStatuses = [];
  for (const channel of channels) {
    channelStatuses.push(await deliverChannel(channel, notification));
  }

  notification.channelStatuses = channelStatuses;
  notification.status = normalizeStatus(channelStatuses);
  notification = await notification.save();
  await createLegacyMessage(MessageModel, notification, req);
  return notification.toObject ? notification.toObject() : notification;
}

async function trigger(req, payload = {}) {
  const eventType = asText(payload.eventType || payload.type || "manual");
  const template = EVENT_TEMPLATES[eventType] || EVENT_TEMPLATES.manual || {};
  const metadata = payload.metadata && typeof payload.metadata === "object" ? payload.metadata : {};
  const relatedLabel = asText(payload.relatedLabel || metadata.documentNo || metadata.invoiceNo || metadata.orderNo || metadata.vehicleNo);
  const suffix = relatedLabel ? ` (${relatedLabel})` : "";

  return create(req, {
    ...template,
    ...payload,
    eventType,
    module: payload.module || template.module || "general",
    title: payload.title || `${template.title || "Notification"}${suffix}`,
    body: payload.body || payload.message || template.body || "A workflow event requires attention.",
    channels: payload.channels || template.channels || ["in_app", "push"],
    metadata,
  });
}

async function list(req) {
  const { NotificationModel } = await scoped(req);
  const limit = Math.min(Number(req.query.limit || 100), 300);
  const query = buildVisibilityQuery(req, req.query || {});
  const notifications = await NotificationModel.find(query).sort({ createdAt: -1 }).limit(limit).lean();
  return notifications.map((row) => mapReadState(row, req));
}

async function overview(req) {
  const notifications = await list(req);
  const channelCounts = CHANNELS.reduce((acc, channel) => ({ ...acc, [channel]: 0 }), {});
  const statusCounts = {};
  const moduleCounts = {};

  for (const row of notifications) {
    for (const channel of row.channels || []) channelCounts[channel] = Number(channelCounts[channel] || 0) + 1;
    statusCounts[row.status || "queued"] = Number(statusCounts[row.status || "queued"] || 0) + 1;
    moduleCounts[row.module || "general"] = Number(moduleCounts[row.module || "general"] || 0) + 1;
  }

  return {
    notifications,
    templates: EVENT_TEMPLATES,
    kpis: {
      total: notifications.length,
      unread: notifications.filter((row) => !row.isRead).length,
      highPriority: notifications.filter((row) => ["high", "critical"].includes(row.priority)).length,
      queued: notifications.filter((row) => ["queued", "partial"].includes(row.status)).length,
      providerNotConfigured: notifications.filter((row) => (row.channelStatuses || []).some((item) => item.status === "provider_not_configured")).length,
    },
    channelCounts,
    statusCounts,
    moduleCounts,
  };
}

async function markRead(req, id) {
  const { NotificationModel } = await scoped(req);
  const ids = uidAliases(req.user || {});
  const uid = ids[0];
  if (!uid) throw new Error("Invalid user.");

  const query = { _id: id, ...buildVisibilityQuery(req, {}) };
  const updated = await NotificationModel.findOneAndUpdate(
    query,
    { $addToSet: { readByUserIds: uid }, $set: { readAt: new Date(), status: "read" } },
    { new: true }
  ).lean();

  if (!updated) throw new Error("Notification not found.");
  return mapReadState(updated, req);
}

async function markAllRead(req) {
  const { NotificationModel } = await scoped(req);
  const ids = uidAliases(req.user || {});
  const uid = ids[0];
  if (!uid) throw new Error("Invalid user.");
  const query = buildVisibilityQuery(req, {});
  const result = await NotificationModel.updateMany(query, { $addToSet: { readByUserIds: uid }, $set: { readAt: new Date() } });
  return { matched: result.matchedCount || result.n || 0, modified: result.modifiedCount || result.nModified || 0 };
}

async function remove(req, id) {
  const { NotificationModel } = await scoped(req);
  const userRole = normalizeRole(req.user?.role);
  const admin = isSystemLevelAdmin(req.user?.role) || userRole === "company admin" || userRole === "super admin";
  if (!admin) throw new Error("Only admins can delete notifications.");
  const deleted = await NotificationModel.findOneAndDelete({ _id: id, ...buildVisibilityQuery(req, {}) }).lean();
  if (!deleted) throw new Error("Notification not found.");
  return deleted;
}

module.exports = {
  CHANNELS,
  EVENT_TEMPLATES,
  overview,
  list,
  create,
  trigger,
  markRead,
  markAllRead,
  remove,
};
