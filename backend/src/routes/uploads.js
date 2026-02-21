const crypto = require("crypto");
const http = require("http");
const https = require("https");
const express = require("express");
const { requireAuth } = require("../utils/auth");
const User = require("../models/User");
const SalesOrder = require("../models/SalesOrder");

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

  const missing = [];
  if (!bucket) missing.push("bucket");
  if (!accountId) missing.push("accountId");
  if (!accessKeyId) missing.push("accessKeyId");
  if (!secretAccessKey) missing.push("secretAccessKey");

  return { bucket, accountId, accessKeyId, secretAccessKey, missing };
}


function normalizeBase64Payload(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const idx = raw.indexOf(",");
  if (raw.startsWith("data:") && idx >= 0) return raw.slice(idx + 1);
  return raw;
}

async function validateSalesmanPodRequest(req, orderId) {
  if (String(req.user?.role || "") !== "Salesman") {
    return { status: 403, body: { ok: false, message: "Only Salesman can request POD upload URLs" } };
  }

  const me = await User.findById(req.user.uid).lean();
  const fieldId = String(me?.fieldId || "").trim();
  if (!fieldId) return { status: 400, body: { ok: false, message: "Salesman field not configured" } };

  const order = await SalesOrder.findById(orderId).lean();
  if (!order) return { status: 404, body: { ok: false, message: "Order not found" } };
  if (String(order.fieldId || "").trim() !== fieldId) {
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

function getPresignedPutUrl({ accountId, accessKeyId, secretAccessKey, bucket, key, contentType, expiresIn = 300 }) {
  const method = "PUT";
  const service = "s3";
  const region = "auto";
  const host = `${bucket}.${accountId}.r2.cloudflarestorage.com`;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const canonicalUri = `/${encodeURIComponent(key).replace(/%2F/g, "/")}`;

  const signedHeaders = "host";
  const query = new URLSearchParams({
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${accessKeyId}/${credentialScope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(expiresIn),
    "X-Amz-SignedHeaders": signedHeaders,
    "x-amz-content-sha256": "UNSIGNED-PAYLOAD",
    "response-content-type": contentType,
  });
  const canonicalQueryString = query.toString();
  const canonicalHeaders = `host:${host}\n`;
  const canonicalRequest = [method, canonicalUri, canonicalQueryString, canonicalHeaders, signedHeaders, "UNSIGNED-PAYLOAD"].join("\n");

  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, sha256Hex(canonicalRequest)].join("\n");

  const signingKey = getSignatureKey(secretAccessKey, dateStamp, region, service);
  const signature = hmac(signingKey, stringToSign, "hex");

  return `https://${host}${canonicalUri}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
}

function uploadBufferWithHttp(putUrl, { contentType, body, timeoutMs = 15000 }) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(putUrl);
    const transport = parsedUrl.protocol === "https:" ? https : http;

    const req = transport.request(
      parsedUrl,
      {
        method: "PUT",
        headers: {
          "Content-Type": contentType,
          "Content-Length": body.length,
        },
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

async function uploadBufferToPresignedUrl(putUrl, { contentType, body }) {
  if (typeof fetch === "function") {
    const response = await fetch(putUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body,
    });
    return { ok: response.ok, status: response.status || 0 };
  }

  return uploadBufferWithHttp(putUrl, { contentType, body });
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

    const { bucket, accountId, accessKeyId, secretAccessKey, missing } = readR2Config();

    if (missing.length) {
      return res.status(500).json({
        ok: false,
        message: `R2 storage is not configured (${missing.join(", ")}). Configure S3-compatible Access Key + Secret (API token is not used for presigned S3 uploads).`,
      });
    }

    const objectKey = `pod/${order._id}/${crypto.randomUUID()}.jpg`;
    const publicUrl = `${resolvePublicBaseUrl()}/${objectKey}`;
    const uploadUrl = getPresignedPutUrl({ accountId, accessKeyId, secretAccessKey, bucket, key: objectKey, contentType: String(contentType).trim() });

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

    const { bucket, accountId, accessKeyId, secretAccessKey, missing } = readR2Config();
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
    const uploadUrl = getPresignedPutUrl({ accountId, accessKeyId, secretAccessKey, bucket, key: objectKey, contentType: String(contentType).trim() });

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

module.exports = router;
