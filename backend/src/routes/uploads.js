const crypto = require("crypto");
const http = require("http");
const https = require("https");
const express = require("express");
const mongoose = require("mongoose");
const { requireAuth } = require("../utils/auth");
const User = require("../models/User");
const SalesOrder = require("../models/SalesOrder");
const WarehouseTransaction = require("../models/WarehouseTransaction");
const Company = require("../models/Company");
const { toTenantDatabaseName } = require("../utils/tenantDatabases");

const router = express.Router();
const DEFAULT_PUBLIC_BASE_URL = "https://files.aimhygienics.com";

function resolvePublicBaseUrl() {
  return firstNonEmpty(process.env.CLOUDFLARE_R2_PUBLIC_BASE_URL, process.env.R2_PUBLIC_BASE_URL, DEFAULT_PUBLIC_BASE_URL).replace(/\/$/, "");
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


function normalizeText(value) {
  return String(value || "").trim();
}

function isSystemLevelAdmin(role) {
  const normalized = normalizeText(role).toLowerCase();
  return normalized === "admin" || normalized === "system admin";
}

async function resolveTenantDbName(companyId, companyName = "") {
  const normalizedCompanyId = normalizeText(companyId);
  const normalizedCompanyName = normalizeText(companyName);
  if (!normalizedCompanyId && !normalizedCompanyName) return "";
  if (normalizedCompanyName) return toTenantDatabaseName(normalizedCompanyName, normalizedCompanyId || "company");
  const company = await Company.findOne({ companyId: normalizedCompanyId }).select("name companyId").lean();
  return toTenantDatabaseName(company?.name || normalizedCompanyId, normalizedCompanyId || "company");
}

function getModelFromDb(db, baseModel) {
  const modelName = baseModel.modelName;
  const collectionName = baseModel.collection?.name;
  return db.models[modelName] || db.model(modelName, baseModel.schema, collectionName);
}

function resolveScopedCompany(req, requestedCompanyId = "", requestedCompanyName = "") {
  if (isSystemLevelAdmin(req.user?.role)) {
    return {
      companyId: normalizeText(requestedCompanyId || req.user?.companyId),
      companyName: normalizeText(requestedCompanyName || req.user?.companyName),
    };
  }
  return {
    companyId: normalizeText(req.user?.companyId),
    companyName: normalizeText(req.user?.companyName),
  };
}

async function getScopedUploadModels(req, requestedCompanyId = "", requestedCompanyName = "") {
  const scope = resolveScopedCompany(req, requestedCompanyId, requestedCompanyName);
  if (!scope.companyId) {
    return { UserModel: User, SalesOrderModel: SalesOrder, WarehouseTransactionModel: WarehouseTransaction, scope };
  }
  const dbName = await resolveTenantDbName(scope.companyId, scope.companyName);
  if (!dbName) {
    return { UserModel: User, SalesOrderModel: SalesOrder, WarehouseTransactionModel: WarehouseTransaction, scope };
  }
  const tenantDb = mongoose.connection.useDb(dbName, { useCache: true });
  return {
    UserModel: getModelFromDb(tenantDb, User),
    SalesOrderModel: getModelFromDb(tenantDb, SalesOrder),
    WarehouseTransactionModel: getModelFromDb(tenantDb, WarehouseTransaction),
    scope,
  };
}

async function findScopedActor(req, UserModel = User) {
  if (!req.user?.uid) return req.user || null;
  try {
    const tenantUser = await UserModel.findById(req.user.uid).lean();
    if (tenantUser) return tenantUser;
  } catch (_error) {}
  try {
    const primaryUser = await User.findById(req.user.uid).lean();
    if (primaryUser) return primaryUser;
  } catch (_error) {}
  return req.user || null;
}

async function validateSupplierTransactionPodRequest(req, transactionId) {
  if (String(req.user?.role || "").trim().toLowerCase() !== "supplier") {
    return { status: 403, body: { ok: false, message: "Only Supplier can request POD upload URLs" } };
  }

  const { UserModel, WarehouseTransactionModel } = await getScopedUploadModels(req, req.body?.companyId || req.query?.companyId, req.body?.companyName || req.query?.companyName);
  const me = await findScopedActor(req, UserModel);
  const transaction = await WarehouseTransactionModel.findById(transactionId).lean();
  if (!transaction) return { status: 404, body: { ok: false, message: "Primary order not found" } };
  if (String(transaction.transactionType || "").toUpperCase() !== "SALE_STOCK") {
    return { status: 400, body: { ok: false, message: "POD upload URL is only available for primary sale requests" } };
  }
  const requestStatus = String(transaction.requestStatus || "").toUpperCase();
  if (!["APPROVED", "DISPATCHED"].includes(requestStatus)) {
    return { status: 400, body: { ok: false, message: "POD upload is allowed only after approval" } };
  }

  const allowedSupplierIds = [normalizeText(me?.userId), normalizeText(me?.supplierId), normalizeText(me?._id), normalizeText(req.user?.uid)].filter(Boolean);
  const allowedSupplierNames = [normalizeText(me?.supplierName), normalizeText(me?.businessName), normalizeText(me?.fullName)].filter(Boolean);
  const assignedSupplierId = normalizeText(transaction.supplierId);
  const assignedSupplierName = normalizeText(transaction.supplierName);
  const isAllowed = allowedSupplierIds.includes(assignedSupplierId) || allowedSupplierNames.includes(assignedSupplierName);
  if (!isAllowed) {
    return { status: 403, body: { ok: false, message: "This primary order is not assigned to you" } };
  }

  return { transaction };
}

async function validateSalesmanPodRequest(req, orderId) {
  if (String(req.user?.role || "").trim().toLowerCase() !== "salesman") {
    return { status: 403, body: { ok: false, message: "Only Salesman can request POD upload URLs" } };
  }

  const { UserModel, SalesOrderModel } = await getScopedUploadModels(req, req.body?.companyId || req.query?.companyId, req.body?.companyName || req.query?.companyName);
  const me = await findScopedActor(req, UserModel);
  const fieldId = normalizeText(me?.fieldId || me?.field_id || req.user?.fieldId || req.user?.field_id);
  const salesmanIds = Array.from(new Set([
    normalizeText(me?.userId),
    normalizeText(me?.salesmanId),
    normalizeText(req.user?.userId),
    normalizeText(req.user?.salesmanId),
    normalizeText(req.user?.uid),
  ].filter(Boolean)));
  if (!fieldId && !salesmanIds.length) return { status: 400, body: { ok: false, message: "Salesman field not configured" } };

  const order = await SalesOrderModel.findById(orderId).lean();
  if (!order) return { status: 404, body: { ok: false, message: "Order not found" } };
  const inField = fieldId && normalizeText(order.fieldId) === fieldId;
  const assignedToSalesman = salesmanIds.length && salesmanIds.includes(normalizeText(order.salesmanId));
  if (!inField && !assignedToSalesman) {
    return { status: 403, body: { ok: false, message: "Order is outside your field" } };
  }
  if (order.status !== "dispatched") {
    return { status: 400, body: { ok: false, message: "POD upload is allowed only for dispatched orders" } };
  }

  return { order };
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