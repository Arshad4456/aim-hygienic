const crypto = require("crypto");
const express = require("express");
const { requireAuth } = require("../utils/auth");
const User = require("../models/User");
const SalesOrder = require("../models/SalesOrder");

const router = express.Router();
const PUBLIC_BASE_URL = "https://files.aimhygienics.com";

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

router.post("/pod-url", requireAuth, async (req, res) => {
  try {
    if (String(req.user?.role || "") !== "Salesman") {
      return res.status(403).json({ ok: false, message: "Only Salesman can request POD upload URLs" });
    }

    const { orderId, contentType } = req.body || {};
    if (!orderId || !contentType) {
      return res.status(400).json({ ok: false, message: "orderId and contentType are required" });
    }

    const me = await User.findById(req.user.uid).lean();
    const fieldId = String(me?.fieldId || "").trim();
    if (!fieldId) return res.status(400).json({ ok: false, message: "Salesman field not configured" });

    const order = await SalesOrder.findById(orderId).lean();
    if (!order) return res.status(404).json({ ok: false, message: "Order not found" });
    if (String(order.fieldId || "").trim() !== fieldId) {
      return res.status(403).json({ ok: false, message: "Order is outside your field" });
    }
    if (order.status !== "dispatched") {
      return res.status(400).json({ ok: false, message: "POD upload is allowed only for dispatched orders" });
    }

    const bucket = process.env.CLOUDFLARE_R2_BUCKET;
    const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
    const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;

    if (!bucket || !accountId || !accessKeyId || !secretAccessKey) {
      return res.status(500).json({ ok: false, message: "R2 storage is not configured" });
    }

    const objectKey = `pod/${order._id}/${crypto.randomUUID()}.jpg`;
    const publicUrl = `${PUBLIC_BASE_URL}/${objectKey}`;
    const uploadUrl = getPresignedPutUrl({ accountId, accessKeyId, secretAccessKey, bucket, key: objectKey, contentType: String(contentType).trim() });

    return res.json({ ok: true, uploadUrl, objectKey, publicUrl });
  } catch (_error) {
    return res.status(500).json({ ok: false, message: "Failed to generate POD upload URL" });
  }
});

module.exports = router;