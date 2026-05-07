const crypto = require("crypto");
const http = require("http");
const https = require("https");
const express = require("express");
const { requireAuth } = require("../utils/auth");
const User = require("../models/User");
const SecondaryOrder = require("../models/SecondaryOrder");
const CompanySalesOrder = require("../models/CompanySalesOrder");
const CompanyDispatchNote = require("../models/CompanyDispatchNote");
const { getScopedModels } = require("../services/scopedModels");
const { APP_BRAND } = require("../config/brand");

const router = express.Router();
const DEFAULT_PUBLIC_BASE_URL = APP_BRAND.publicFileBaseUrl;

function normalizeRole(value) {
  return String(value || "").trim().toLowerCase();
}

function uniqueScopedIds(...values) {
  return Array.from(new Set(values.map((value) => String(value || "").trim()).filter(Boolean)));
}

async function getScopedUploadModels(req) {
  return getScopedModels(req, {
    UserModel: User,
    SecondaryOrderModel: SecondaryOrder,
    CompanySalesOrderModel: CompanySalesOrder,
    CompanyDispatchNoteModel: CompanyDispatchNote,
  });
}

async function findScopedUploadUser(req) {
  const { UserModel } = await getScopedUploadModels(req);
  const auth = req.user || {};
  const fallbackUser = auth?.uid ? { ...auth, _id: auth.uid } : auth || null;
  const lookupQueries = [];

  if (auth?.uid) lookupQueries.push({ _id: auth.uid });
  if (auth?.userId) lookupQueries.push({ userId: String(auth.userId).trim() });
  if (auth?.username) {
    lookupQueries.push({ username: String(auth.username).trim() });
    lookupQueries.push({ username: String(auth.username).trim().toLowerCase() });
  }

  const models = Array.from(new Set([UserModel, User].filter(Boolean)));
  for (const model of models) {
    for (const query of lookupQueries) {
      try {
        const found = await model.findOne(query).lean();
        if (found) return { ...auth, ...found, _id: found._id };
      } catch (_error) {}
    }
  }

  return fallbackUser;
}

function canDeliveryActorAccessOrder(order, actor = {}) {
  const fieldId = String(actor.fieldId || "").trim();
  const actorIds = Array.isArray(actor.actorIds) ? actor.actorIds : [];
  const orderFieldId = String(order?.fieldId || "").trim();
  const orderActorIds = uniqueScopedIds(order?.salesmanUserId, order?.deliveryBoyId);
  if (fieldId && orderFieldId && fieldId === orderFieldId) return true;
  if (actorIds.length && orderActorIds.some((value) => actorIds.includes(value))) return true;
  if (fieldId && !orderFieldId && !orderActorIds.length) return true;
  return false;
}

function extractSupplierAccess(document = {}) {
  const supplierIds = uniqueScopedIds(
    document?.supplierId,
    document?.assignedSupplierId,
    document?.supplier?.partyId,
    document?.supplier?.id
  );
  const supplierNames = uniqueScopedIds(
    document?.supplierName,
    document?.assignedSupplierName,
    document?.supplier?.partyName,
    document?.supplier?.name
  );
  return { supplierIds, supplierNames };
}

async function validateSupplierTransactionPodRequest(req, transactionId) {
  if (String(req.user?.role || "") !== "Supplier") {
    return { status: 403, body: { ok: false, message: "Only Supplier can request POD upload URLs" } };
  }

  const { CompanySalesOrderModel, CompanyDispatchNoteModel } = await getScopedUploadModels(req);
  const me = await findScopedUploadUser(req);
  if (!me) return { status: 404, body: { ok: false, message: "User not found" } };

  const [dispatchDoc, orderDoc] = await Promise.all([
    CompanyDispatchNoteModel.findById(transactionId).lean().catch(() => null),
    CompanySalesOrderModel.findById(transactionId).lean().catch(() => null),
  ]);
  const transaction = dispatchDoc || orderDoc;
  if (!transaction) {
    return { status: 404, body: { ok: false, message: "Primary order not found" } };
  }

  const normalizedStatus = normalizeRole(transaction?.status);
  const allowedStatuses = dispatchDoc
    ? ["draft", "posted", "delivered"]
    : ["approved", "reserved", "ready_to_dispatch", "dispatched", "received", "invoiced", "closed"];
  if (!allowedStatuses.includes(normalizedStatus)) {
    return { status: 400, body: { ok: false, message: "POD upload is allowed only after approval" } };
  }

  const allowedSupplierIds = uniqueScopedIds(me.userId, me.supplierId, me._id);
  const allowedSupplierNames = uniqueScopedIds(me.supplierName, me.businessName, me.fullName);
  const { supplierIds, supplierNames } = extractSupplierAccess(transaction);

  if (supplierIds.length || supplierNames.length) {
    const isAllowed =
      supplierIds.some((value) => allowedSupplierIds.includes(value)) ||
      supplierNames.some((value) => allowedSupplierNames.includes(value));
    if (!isAllowed) {
      return { status: 403, body: { ok: false, message: "This primary order is not assigned to you" } };
    }
  }

  return { transaction };
}

async function validateSalesmanPodRequest(req, orderId) {
  const requestRole = normalizeRole(req.user?.role);
  if (!["salesman", "delivery boy"].includes(requestRole)) {
    return { status: 403, body: { ok: false, message: "Only Salesman or Delivery Boy can request POD upload URLs" } };
  }

  const { SecondaryOrderModel } = await getScopedUploadModels(req);
  const me = await findScopedUploadUser(req);
  if (!me) {
    return { status: 404, body: { ok: false, message: "User not found" } };
  }

  const actor = {
    fieldId: String(me?.fieldId || req.user?.fieldId || "").trim(),
    actorIds: uniqueScopedIds(me?._id, me?.userId, me?.salesmanId, me?.deliveryBoyId, req.user?.uid, req.user?.userId, req.user?.salesmanId, req.user?.deliveryBoyId),
  };

  const order = await SecondaryOrderModel.findById(orderId).lean();
  if (!order) return { status: 404, body: { ok: false, message: "Order not found" } };
  if (!canDeliveryActorAccessOrder(order, actor)) {
    return { status: 403, body: { ok: false, message: "Order is outside your delivery scope" } };
  }
  if (!["dispatched", "delivered"].includes(normalizeRole(order.status))) {
    return { status: 400, body: { ok: false, message: "POD upload is allowed only for dispatched orders" } };
  }

  return { order };
}

function resolvePublicBaseUrl() {
  return firstNonEmpty(process.env.CLOUDFLARE_R2_PUBLIC_BASE_URL, process.env.R2_PUBLIC_BASE_URL, process.env.PUBLIC_FILE_BASE_URL, DEFAULT_PUBLIC_BASE_URL).replace(/\/$/, "");
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (String(value || "").trim()) return String(value).trim();
  }
  return "";
}

function readR2Config() {
  const bucket = firstNonEmpty(
    process.env.CLOUDFLARE_R2_BUCKET,
    process.env.CLOUDFLARE_R2_BUCKET_NAME,
    process.env.R2_BUCKET,
    process.env.R2_BUCKET_NAME
  );
  const accountId = firstNonEmpty(
    process.env.CLOUDFLARE_R2_ACCOUNT_ID,
    process.env.CF_ACCOUNT_ID,
    process.env.R2_ACCOUNT_ID
  );
  const accessKeyId = firstNonEmpty(
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    process.env.CLOUDFLARE_R2_ACCESS_KEY,
    process.env.CLOUDFLARE_ACCESS_KEY_ID,
    process.env.R2_ACCESS_KEY_ID,
    process.env.R2_ACCESS_KEY,
    process.env.AWS_ACCESS_KEY_ID
  );
  const secretAccessKey = firstNonEmpty(
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
    process.env.CLOUDFLARE_R2_SECRET_KEY,
    process.env.CLOUDFLARE_SECRET_ACCESS_KEY,
    process.env.R2_SECRET_ACCESS_KEY,
    process.env.R2_SECRET_KEY,
    process.env.AWS_SECRET_ACCESS_KEY
  );

  const endpoint = firstNonEmpty(process.env.CLOUDFLARE_R2_S3_ENDPOINT, process.env.R2_S3_ENDPOINT);
  const jurisdiction = firstNonEmpty(process.env.CLOUDFLARE_R2_JURISDICTION, process.env.R2_JURISDICTION);

  const missing = [];
  if (!bucket) missing.push("bucket");
  if (!accountId) missing.push("accountId");
  if (!accessKeyId) missing.push("accessKeyId");
  if (!secretAccessKey) missing.push("secretAccessKey");

  return { bucket, accountId, accessKeyId, secretAccessKey, endpoint, jurisdiction, missing };
}

function resolveR2ApiHost({ accountId, endpoint, jurisdiction }) {
  if (endpoint) return new URL(endpoint).hostname;
  if (jurisdiction) return `${accountId}.${jurisdiction}.r2.cloudflarestorage.com`;
  return `${accountId}.r2.cloudflarestorage.com`;
}

function normalizeBase64Payload(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const idx = raw.indexOf(",");
  if (raw.startsWith("data:") && idx >= 0) return raw.slice(idx + 1);
  return raw;
}

function sha256Hex(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function hmac(key, data, encoding) {
  return crypto.createHmac("sha256", key).update(data).digest(encoding);
}

function getSignatureKey(secretKey, dateStamp, regionName, serviceName) {
  const kDate = hmac(`AWS4${secretKey}`, dateStamp);
  const kRegion = hmac(kDate, regionName);
  const kService = hmac(kRegion, serviceName);
  return hmac(kService, "aws4_request");
}

function getPresignedPutUrl({ accountId, accessKeyId, secretAccessKey, bucket, key, endpoint, jurisdiction, expiresIn = 300 }) {
  const method = "PUT";
  const service = "s3";
  const region = "auto";
  const host = resolveR2ApiHost({ accountId, endpoint, jurisdiction });
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const canonicalUri = `/${encodeURIComponent(bucket)}/${encodeURIComponent(key).replace(/%2F/g, "/")}`;

  const signedHeaders = "host";
  const query = new URLSearchParams({
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${accessKeyId}/${credentialScope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(expiresIn),
    "X-Amz-SignedHeaders": signedHeaders,
    "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
  });
  const canonicalQueryString = query.toString();
  const canonicalHeaders = `host:${host}\n`;
  const canonicalRequest = [method, canonicalUri, canonicalQueryString, canonicalHeaders, signedHeaders, "UNSIGNED-PAYLOAD"].join("\n");

  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, sha256Hex(canonicalRequest)].join("\n");

  const signingKey = getSignatureKey(secretAccessKey, dateStamp, region, service);
  const signature = hmac(signingKey, stringToSign, "hex");

  return `https://${host}${canonicalUri}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
}

function assertR2UploadHost(uploadUrl) {
  const parsed = new URL(uploadUrl);
  if (!String(parsed.hostname || "").toLowerCase().endsWith(".r2.cloudflarestorage.com")) {
    throw new Error("Presigned upload URL must target r2.cloudflarestorage.com host");
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function uploadBufferWithHttp(putUrl, { contentType, body, timeoutMs = 15000, family } = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(putUrl);
    const isHttps = parsedUrl.protocol === "https:";
    const transport = isHttps ? https : http;

    const req = transport.request(
      {
        protocol: parsedUrl.protocol,
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: `${parsedUrl.pathname}${parsedUrl.search}`,
        method: "PUT",
        headers: {
          "Content-Type": contentType,
          "Content-Length": body.length,
        },
        ...(family ? { family } : {}),
      },
      (response) => {
        response.resume();
        response.on("end", () => {
          resolve({ ok: response.statusCode >= 200 && response.statusCode < 300, status: response.statusCode || 0 });
        });
      }
    );

    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error("Upload request timed out"));
    });
    req.on("error", reject);
    req.end(body);
  });
}

function parseUploadError(error) {
  const primary = String(error?.message || "").trim();
  const nested = String(error?.cause?.message || "").trim();
  return nested && nested !== primary ? `${primary} (${nested})` : primary;
}

async function uploadBufferToPresignedUrl(putUrl, { contentType, body }) {
  let lastError = null;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await fetch(putUrl, {
        method: "PUT",
        headers: { "Content-Type": contentType },
        body,
      });
      return { ok: response.ok, status: response.status || 0 };
    } catch (error) {
      lastError = error;
      if (attempt < 2) await sleep(250 * attempt);
    }
  }

  const fallbackAttempts = [
    () => uploadBufferWithHttp(putUrl, { contentType, body, family: 4 }),
    () => uploadBufferWithHttp(putUrl, { contentType, body }),
  ];

  for (const attempt of fallbackAttempts) {
    try {
      return await attempt();
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(parseUploadError(lastError) || "Upload failed");
}

router.post("/pod-url", requireAuth, async (req, res) => {
  try {
    const { orderId, contentType } = req.body || {};
    if (!orderId || !contentType) {
      return res.status(400).json({ ok: false, message: "orderId and contentType are required" });
    }

    const validation = await validateSalesmanPodRequest(req, orderId);
    if (validation.status) {
      return res.status(validation.status).json(validation.body);
    }
    const { order } = validation;

    const { bucket, accountId, accessKeyId, secretAccessKey, endpoint, jurisdiction, missing } = readR2Config();

    if (missing.length) {
      return res.status(500).json({
        ok: false,
        message: `R2 storage is not configured (${missing.join(", ")}). Configure S3-compatible Access Key + Secret (API token is not used for presigned S3 uploads).`,
      });
    }

    const objectKey = `pod/${order._id}/${crypto.randomUUID()}.jpg`;
    const publicUrl = `${resolvePublicBaseUrl()}/${objectKey}`;
    const uploadUrl = getPresignedPutUrl({ accountId, accessKeyId, secretAccessKey, bucket, key: objectKey, endpoint, jurisdiction });
    assertR2UploadHost(uploadUrl);

    return res.json({ ok: true, uploadUrl, objectKey, publicUrl });
  } catch (_error) {
    return res.status(500).json({ ok: false, message: "Failed to generate POD upload URL" });
  }
});

router.post("/pod-proxy", requireAuth, async (req, res) => {
  try {
    const { orderId, contentType, fileBase64 } = req.body || {};
    if (!orderId || !contentType || !fileBase64) {
      return res.status(400).json({ ok: false, message: "orderId, contentType and fileBase64 are required" });
    }

    const validation = await validateSalesmanPodRequest(req, orderId);
    if (validation.status) {
      return res.status(validation.status).json(validation.body);
    }
    const { order } = validation;

    const { bucket, accountId, accessKeyId, secretAccessKey, endpoint, jurisdiction, missing } = readR2Config();
    if (missing.length) {
      return res.status(500).json({
        ok: false,
        message: `R2 storage is not configured (${missing.join(", ")}). Configure S3-compatible Access Key + Secret (API token is not used for presigned S3 uploads).`,
      });
    }

    const base64Payload = normalizeBase64Payload(fileBase64);
    const fileBuffer = Buffer.from(base64Payload, "base64");
    if (!fileBuffer.length) {
      return res.status(400).json({ ok: false, message: "Invalid base64 file payload" });
    }

    const objectKey = `pod/${order._id}/${crypto.randomUUID()}.jpg`;
    const publicUrl = `${resolvePublicBaseUrl()}/${objectKey}`;
    const uploadUrl = getPresignedPutUrl({ accountId, accessKeyId, secretAccessKey, bucket, key: objectKey, endpoint, jurisdiction });
    assertR2UploadHost(uploadUrl);

    const cloudRes = await uploadBufferToPresignedUrl(uploadUrl, {
      contentType: String(contentType).trim() || "image/jpeg",
      body: fileBuffer,
    });

    if (!cloudRes.ok) {
      return res.status(502).json({ ok: false, message: `R2 upload failed (${cloudRes.status})` });
    }

    return res.json({ ok: true, objectKey, publicUrl });
  } catch (error) {
    const message = String(error?.message || "").trim();
    return res.status(500).json({ ok: false, message: message ? `Failed to upload POD to storage: ${message}` : "Failed to upload POD to storage" });
  }
});


router.post("/transaction-pod-url", requireAuth, async (req, res) => {
  try {
    const { transactionId, contentType } = req.body || {};
    if (!transactionId || !contentType) {
      return res.status(400).json({ ok: false, message: "transactionId and contentType are required" });
    }

    const validation = await validateSupplierTransactionPodRequest(req, transactionId);
    if (validation.status) {
      return res.status(validation.status).json(validation.body);
    }
    const { transaction } = validation;

    const { bucket, accountId, accessKeyId, secretAccessKey, endpoint, jurisdiction, missing } = readR2Config();
    if (missing.length) {
      return res.status(500).json({
        ok: false,
        message: `R2 storage is not configured (${missing.join(", ")}). Configure S3-compatible Access Key + Secret (API token is not used for presigned S3 uploads).`,
      });
    }

    const objectKey = `supplier-pod/${transaction._id}/${crypto.randomUUID()}.jpg`;
    const publicUrl = `${resolvePublicBaseUrl()}/${objectKey}`;
    const uploadUrl = getPresignedPutUrl({ accountId, accessKeyId, secretAccessKey, bucket, key: objectKey, endpoint, jurisdiction });
    assertR2UploadHost(uploadUrl);

    return res.json({ ok: true, uploadUrl, objectKey, publicUrl });
  } catch (_error) {
    return res.status(500).json({ ok: false, message: "Failed to generate supplier POD upload URL" });
  }
});

router.post("/transaction-pod-proxy", requireAuth, async (req, res) => {
  try {
    const { transactionId, contentType, fileBase64 } = req.body || {};
    if (!transactionId || !contentType || !fileBase64) {
      return res.status(400).json({ ok: false, message: "transactionId, contentType and fileBase64 are required" });
    }

    const validation = await validateSupplierTransactionPodRequest(req, transactionId);
    if (validation.status) {
      return res.status(validation.status).json(validation.body);
    }
    const { transaction } = validation;

    const { bucket, accountId, accessKeyId, secretAccessKey, endpoint, jurisdiction, missing } = readR2Config();
    if (missing.length) {
      return res.status(500).json({
        ok: false,
        message: `R2 storage is not configured (${missing.join(", ")}). Configure S3-compatible Access Key + Secret (API token is not used for presigned S3 uploads).`,
      });
    }

    const base64Payload = normalizeBase64Payload(fileBase64);
    const fileBuffer = Buffer.from(base64Payload, "base64");
    if (!fileBuffer.length) {
      return res.status(400).json({ ok: false, message: "Invalid base64 file payload" });
    }

    const objectKey = `supplier-pod/${transaction._id}/${crypto.randomUUID()}.jpg`;
    const publicUrl = `${resolvePublicBaseUrl()}/${objectKey}`;
    const uploadUrl = getPresignedPutUrl({ accountId, accessKeyId, secretAccessKey, bucket, key: objectKey, endpoint, jurisdiction });
    assertR2UploadHost(uploadUrl);

    const cloudRes = await uploadBufferToPresignedUrl(uploadUrl, {
      contentType: String(contentType).trim() || "image/jpeg",
      body: fileBuffer,
    });

    if (!cloudRes.ok) {
      return res.status(502).json({ ok: false, message: `R2 upload failed (${cloudRes.status})` });
    }

    return res.json({ ok: true, objectKey, publicUrl });
  } catch (error) {
    const message = String(error?.message || "").trim();
    return res.status(500).json({ ok: false, message: message ? `Failed to upload supplier POD to storage: ${message}` : "Failed to upload supplier POD to storage" });
  }
});



function extensionFromContentType(contentType = "") {
  const normalized = String(contentType || "").toLowerCase();
  if (normalized.includes("png")) return "png";
  if (normalized.includes("webp")) return "webp";
  if (normalized.includes("pdf")) return "pdf";
  return "jpg";
}

function sanitizeFileLabel(value) {
  const clean = String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_");
  return clean || "document";
}


const SUPPORTED_DOCUMENT_ENTITIES = new Set(["user-document", "company-document", "payment-proof", "proof-of-delivery", "invoice-attachment", "receipt-attachment", "vehicle-proof"]);
function isSupportedUploadContentType(contentType = "") { const normalized = String(contentType || "").toLowerCase().trim(); return ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"].some((type) => normalized.startsWith(type)); }
function tenantUploadScope(req) { return sanitizeFileLabel(req.user?.companyId || req.user?.tenantId || req.user?.companySlug || "global"); }
function normalizeUploadEntity(value = "") { const entityType = sanitizeFileLabel(String(value || "").toLowerCase().trim()); return SUPPORTED_DOCUMENT_ENTITIES.has(entityType) ? entityType : ""; }
function buildDocumentObjectKey(req, { entityType, entityId, slot, contentType, fileName }) { const ext = extensionFromContentType(contentType); const tenant = tenantUploadScope(req); const safeEntity = normalizeUploadEntity(entityType); const safeEntityId = sanitizeFileLabel(entityId || "general"); const safeSlot = sanitizeFileLabel(slot || fileName || "attachment").replace(/\.[a-z0-9]+$/i, ""); return `documents/${tenant}/${safeEntity}/${safeEntityId}/${safeSlot}-${crypto.randomUUID()}.${ext}`; }
function readAndValidateDocumentUploadConfig({ entityType, entityId, contentType }) {
  const safeEntity = normalizeUploadEntity(entityType);
  if (!safeEntity) return { error: { status: 400, body: { ok: false, message: `entityType must be one of: ${Array.from(SUPPORTED_DOCUMENT_ENTITIES).join(", ")}` } } };
  if (!entityId) return { error: { status: 400, body: { ok: false, message: "entityId is required" } } };
  if (!contentType || !isSupportedUploadContentType(contentType)) return { error: { status: 400, body: { ok: false, message: "contentType must be image/jpeg, image/png, image/webp, or application/pdf" } } };
  const r2 = readR2Config();
  if (r2.missing.length) return { error: { status: 500, body: { ok: false, message: `R2 storage is not configured (${r2.missing.join(", ")}). Configure S3-compatible Access Key + Secret for Cloudflare R2 uploads.` } } };
  return { safeEntity, r2 };
}
router.post("/document-url", requireAuth, async (req, res) => { try { const { entityType, entityId, slot, contentType, fileName } = req.body || {}; const validation = readAndValidateDocumentUploadConfig({ entityType, entityId, contentType }); if (validation.error) return res.status(validation.error.status).json(validation.error.body); const objectKey = buildDocumentObjectKey(req, { entityType: validation.safeEntity, entityId, slot, contentType, fileName }); const publicUrl = `${resolvePublicBaseUrl()}/${objectKey}`; const uploadUrl = getPresignedPutUrl({ accountId: validation.r2.accountId, accessKeyId: validation.r2.accessKeyId, secretAccessKey: validation.r2.secretAccessKey, bucket: validation.r2.bucket, key: objectKey, endpoint: validation.r2.endpoint, jurisdiction: validation.r2.jurisdiction }); assertR2UploadHost(uploadUrl); return res.json({ ok: true, uploadUrl, objectKey, publicUrl, entityType: validation.safeEntity }); } catch (_error) { return res.status(500).json({ ok: false, message: "Failed to generate document upload URL" }); } });
router.post("/document", requireAuth, async (req, res) => { try { const { entityType, entityId, slot, contentType, fileName, fileBase64 } = req.body || {}; if (!fileBase64) return res.status(400).json({ ok: false, message: "fileBase64 is required" }); const validation = readAndValidateDocumentUploadConfig({ entityType, entityId, contentType }); if (validation.error) return res.status(validation.error.status).json(validation.error.body); const base64Payload = normalizeBase64Payload(fileBase64); const fileBuffer = Buffer.from(base64Payload, "base64"); if (!fileBuffer.length) return res.status(400).json({ ok: false, message: "Invalid base64 file payload" }); const objectKey = buildDocumentObjectKey(req, { entityType: validation.safeEntity, entityId, slot, contentType, fileName }); const publicUrl = `${resolvePublicBaseUrl()}/${objectKey}`; const uploadUrl = getPresignedPutUrl({ accountId: validation.r2.accountId, accessKeyId: validation.r2.accessKeyId, secretAccessKey: validation.r2.secretAccessKey, bucket: validation.r2.bucket, key: objectKey, endpoint: validation.r2.endpoint, jurisdiction: validation.r2.jurisdiction }); assertR2UploadHost(uploadUrl); const cloudRes = await uploadBufferToPresignedUrl(uploadUrl, { contentType: String(contentType).trim(), body: fileBuffer }); if (!cloudRes.ok) return res.status(502).json({ ok: false, message: `R2 upload failed (${cloudRes.status})` }); return res.json({ ok: true, objectKey, publicUrl, entityType: validation.safeEntity }); } catch (error) { const message = String(error?.message || "").trim(); return res.status(500).json({ ok: false, message: message ? `Failed to upload document: ${message}` : "Failed to upload document" }); } });

router.post("/user-document", requireAuth, async (req, res) => {
  try {
    const { userId, contentType, fileBase64, fileName } = req.body || {};
    if (!userId || !contentType || !fileBase64) {
      return res.status(400).json({ ok: false, message: "userId, contentType and fileBase64 are required" });
    }

    const normalizedType = String(contentType || "").toLowerCase().trim();
    if (!normalizedType.includes("pdf")) {
      return res.status(400).json({ ok: false, message: "Only PDF files are allowed" });
    }

    const { bucket, accountId, accessKeyId, secretAccessKey, endpoint, jurisdiction, missing } = readR2Config();
    if (missing.length) {
      return res.status(500).json({
        ok: false,
        message: `R2 storage is not configured (${missing.join(", ")}). Configure S3-compatible Access Key + Secret (API token is not used for presigned S3 uploads).`,
      });
    }

    const base64Payload = normalizeBase64Payload(fileBase64);
    const fileBuffer = Buffer.from(base64Payload, "base64");
    if (!fileBuffer.length) {
      return res.status(400).json({ ok: false, message: "Invalid base64 file payload" });
    }

    const safeUserId = sanitizeFileLabel(userId);
    const safeName = sanitizeFileLabel(fileName || "document.pdf").replace(/\.pdf$/i, "");
    const objectKey = `User Documents/${safeUserId}/${safeName}-${Date.now()}.pdf`;
    const publicUrl = `${resolvePublicBaseUrl()}/${objectKey}`;
    const uploadUrl = getPresignedPutUrl({ accountId, accessKeyId, secretAccessKey, bucket, key: objectKey, endpoint, jurisdiction });
    assertR2UploadHost(uploadUrl);

    const cloudRes = await uploadBufferToPresignedUrl(uploadUrl, {
      contentType: "application/pdf",
      body: fileBuffer,
    });

    if (!cloudRes.ok) {
      return res.status(502).json({ ok: false, message: `R2 upload failed (${cloudRes.status})` });
    }

    return res.json({ ok: true, objectKey, publicUrl });
  } catch (error) {
    const message = String(error?.message || "").trim();
    return res.status(500).json({ ok: false, message: message ? `Failed to upload user document: ${message}` : "Failed to upload user document" });
  }
});

router.post("/payment-proof", requireAuth, async (req, res) => {
  try {
    const { contentType, fileBase64 } = req.body || {};
    if (!contentType || !fileBase64) {
      return res.status(400).json({ ok: false, message: "contentType and fileBase64 are required" });
    }

    const { bucket, accountId, accessKeyId, secretAccessKey, endpoint, jurisdiction, missing } = readR2Config();
    if (missing.length) {
      return res.status(500).json({
        ok: false,
        message: `R2 storage is not configured (${missing.join(", ")}). Configure S3-compatible Access Key + Secret (API token is not used for presigned S3 uploads).`,
      });
    }

    const base64Payload = normalizeBase64Payload(fileBase64);
    const fileBuffer = Buffer.from(base64Payload, "base64");
    if (!fileBuffer.length) {
      return res.status(400).json({ ok: false, message: "Invalid base64 file payload" });
    }

    const ext = extensionFromContentType(contentType);
    const objectKey = `payment-proof/${req.user.uid}/${crypto.randomUUID()}.${ext}`;
    const publicUrl = `${resolvePublicBaseUrl()}/${objectKey}`;
    const uploadUrl = getPresignedPutUrl({ accountId, accessKeyId, secretAccessKey, bucket, key: objectKey, endpoint, jurisdiction });
    assertR2UploadHost(uploadUrl);

    const cloudRes = await uploadBufferToPresignedUrl(uploadUrl, {
      contentType: String(contentType).trim() || "image/jpeg",
      body: fileBuffer,
    });

    if (!cloudRes.ok) {
      return res.status(502).json({ ok: false, message: `R2 upload failed (${cloudRes.status})` });
    }

    return res.json({ ok: true, objectKey, publicUrl });
  } catch (error) {
    const message = String(error?.message || "").trim();
    return res.status(500).json({ ok: false, message: message ? `Failed to upload payment proof: ${message}` : "Failed to upload payment proof" });
  }
});


router.post("/vehicle-proof-url", requireAuth, async (req, res) => {
  try {
    const { vehicleId, entity, recordId, slot, contentType, date } = req.body || {};
    if (!vehicleId || !entity || !recordId || !slot || !contentType) {
      return res.status(400).json({ ok: false, message: "vehicleId, entity, recordId, slot and contentType are required" });
    }

    const { bucket, accountId, accessKeyId, secretAccessKey, endpoint, jurisdiction, missing } = readR2Config();
    if (missing.length) {
      return res.status(500).json({
        ok: false,
        message: `R2 storage is not configured (${missing.join(", ")}). Configure S3-compatible Access Key + Secret (API token is not used for presigned S3 uploads).`,
      });
    }

    const d = date ? new Date(date) : new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const ext = extensionFromContentType(contentType);

    let objectKey = "";
    if (entity === "fuel") {
      objectKey = `fuel/${vehicleId}/${year}/${month}/${recordId}/${slot}.${ext}`;
    } else if (entity === "vehicle-maintenance") {
      objectKey = `vehicle-maintenance/${vehicleId}/${year}/${month}/${recordId}/${slot}.${ext}`;
    } else {
      return res.status(400).json({ ok: false, message: "entity must be fuel or vehicle-maintenance" });
    }

    const publicUrl = `${resolvePublicBaseUrl()}/${objectKey}`;
    const uploadUrl = getPresignedPutUrl({ accountId, accessKeyId, secretAccessKey, bucket, key: objectKey, endpoint, jurisdiction });
    assertR2UploadHost(uploadUrl);

    return res.json({ ok: true, uploadUrl, objectKey, publicUrl });
  } catch (_error) {
    return res.status(500).json({ ok: false, message: "Failed to generate vehicle proof upload URL" });
  }
});


router.post("/vehicle-proof", requireAuth, async (req, res) => {
  try {
    const { vehicleId, entity, recordId, slot, contentType, fileBase64, date } = req.body || {};
    if (!vehicleId || !entity || !recordId || !slot || !contentType || !fileBase64) {
      return res.status(400).json({ ok: false, message: "vehicleId, entity, recordId, slot, contentType and fileBase64 are required" });
    }

    const { bucket, accountId, accessKeyId, secretAccessKey, endpoint, jurisdiction, missing } = readR2Config();
    if (missing.length) {
      return res.status(500).json({
        ok: false,
        message: `R2 storage is not configured (${missing.join(", ")}). Configure S3-compatible Access Key + Secret (API token is not used for presigned S3 uploads).`,
      });
    }

    const d = date ? new Date(date) : new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const ext = extensionFromContentType(contentType);

    let objectKey = "";
    if (entity === "fuel") {
      objectKey = `fuel/${vehicleId}/${year}/${month}/${recordId}/${slot}.${ext}`;
    } else if (entity === "vehicle-maintenance") {
      objectKey = `vehicle-maintenance/${vehicleId}/${year}/${month}/${recordId}/${slot}.${ext}`;
    } else {
      return res.status(400).json({ ok: false, message: "entity must be fuel or vehicle-maintenance" });
    }

    const base64Payload = normalizeBase64Payload(fileBase64);
    const fileBuffer = Buffer.from(base64Payload, "base64");
    if (!fileBuffer.length) {
      return res.status(400).json({ ok: false, message: "Invalid base64 file payload" });
    }

    const publicUrl = `${resolvePublicBaseUrl()}/${objectKey}`;
    const uploadUrl = getPresignedPutUrl({ accountId, accessKeyId, secretAccessKey, bucket, key: objectKey, endpoint, jurisdiction });
    assertR2UploadHost(uploadUrl);

    const cloudRes = await uploadBufferToPresignedUrl(uploadUrl, {
      contentType: String(contentType).trim() || "image/jpeg",
      body: fileBuffer,
    });

    if (!cloudRes.ok) {
      return res.status(502).json({ ok: false, message: `R2 upload failed (${cloudRes.status})` });
    }

    return res.json({ ok: true, objectKey, publicUrl });
  } catch (error) {
    const message = String(error?.message || "").trim();
    return res.status(500).json({ ok: false, message: message ? `Failed to upload vehicle proof: ${message}` : "Failed to upload vehicle proof" });
  }
});

module.exports = router;