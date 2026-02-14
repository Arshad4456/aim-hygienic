const express = require("express");
const Product = require("../models/Product");
const { requireAuth } = require("../utils/auth");

const router = express.Router();

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toBool(value) {
  if (typeof value === "boolean") return value;
  const normalized = String(value || "").trim().toLowerCase();
  return ["checked", "true", "yes", "1"].includes(normalized);
}

function normalizePayload(body = {}) {
  return {
    code: String(body.code || "").trim(),
    productId: String(body.productId || body.code || "").trim(),
    name: String(body.name || "").trim(),
    alternativeName: String(body.alternativeName || "").trim(),
    companyId: String(body.companyId || "").trim(),
    companyName: String(body.companyName || "").trim(),
    category: String(body.category || "").trim(),
    subCategory: String(body.subCategory || "").trim(),
    size: String(body.size || "").trim(),
    unit: String(body.unit || "").trim(),
    weight: toNumber(body.weight),
    weightUnitName: String(body.weightUnitName || "").trim(),
    cartonSize: toNumber(body.cartonSize),
    packSize: toNumber(body.packSize),
    retailPrice: toNumber(body.retailPrice),
    wholesalePrice: toNumber(body.wholesalePrice),
    tradePrice: toNumber(body.tradePrice),
    taxablePrice: toNumber(body.taxablePrice),
    customerPrice: toNumber(body.customerPrice),
    costPrice: toNumber(body.costPrice),
    discountPer: toNumber(body.discountPer),
    unitScheme: toNumber(body.unitScheme),
    isTaxFromCustomer: toBool(body.isTaxFromCustomer),
    isTaxAppliedOnBonus: toBool(body.isTaxAppliedOnBonus),
    isTaxAppliedAfterDiscountAndScheme: toBool(body.isTaxAppliedAfterDiscountAndScheme),
    isDiscountAppliedAfterScheme: toBool(body.isDiscountAppliedAfterScheme),
    taxPer: toNumber(body.taxPer),
    fedPer: toNumber(body.fedPer),
    taxTypeName: String(body.taxTypeName || "").trim(),
    activationType: String(body.activationType || "").trim(),
    barcode: String(body.barcode || "").trim(),
    bulkBarcode: String(body.bulkBarcode || "").trim(),
    sku: String(body.sku || "").trim(),
    description: String(body.description || "").trim(),
  };
}

router.post("/", requireAuth, async (req, res) => {
  try {
    const body = normalizePayload(req.body || {});
    const doc = await Product.create({ ...body, createdBy: req.user?.uid });
    return res.status(201).json({ ok: true, product: doc });
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ ok: false, message: "Product ID already exists" });
    }
    return res.status(500).json({ ok: false, message: "Failed to create product" });
  }
});

router.post("/bulk-upsert", requireAuth, async (req, res) => {
  try {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    if (!rows.length) {
      return res.status(400).json({ ok: false, message: "No rows provided" });
    }

    const operations = [];
    const skipped = [];
    rows.forEach((row, idx) => {
      const normalized = normalizePayload(row || {});
      if (!normalized.productId || !normalized.name) {
        skipped.push({
          row: idx + 1,
          reason: "Missing Product ID or Product Name",
        });
        return;
      }
      operations.push({
        updateOne: {
          filter: { productId: normalized.productId },
          update: {
            $set: normalized,
            $setOnInsert: { createdBy: req.user?.uid },
          },
          upsert: true,
        },
      });
    });

    if (!operations.length) {
      return res.status(400).json({ ok: false, message: "No valid rows found", skipped });
    }

    const result = await Product.bulkWrite(operations, { ordered: false });
    return res.json({
      ok: true,
      summary: {
        received: rows.length,
        processed: operations.length,
        inserted: result.upsertedCount || 0,
        updated: result.modifiedCount || 0,
        skipped: skipped.length,
      },
      skipped,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to import products" });
  }
});

router.get("/", requireAuth, async (req, res) => {
  try {
    const query = {};
    if (req.query.companyId) query.companyId = String(req.query.companyId);
    if (req.query.category) query.category = String(req.query.category);
    if (req.query.subCategory) query.subCategory = String(req.query.subCategory);
    const items = await Product.find(query).sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, products: items });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load products" });
  }
});

router.get("/barcodes", requireAuth, async (req, res) => {
  try {
    const items = await Product.find().select("productId name barcode category subCategory size").lean();
    return res.json({ ok: true, products: items });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load barcodes" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const item = await Product.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ ok: false, message: "Not found" });
    return res.json({ ok: true, product: item });
  } catch (e) {
    return res.status(400).json({ ok: false, message: "Invalid id" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const body = normalizePayload(req.body || {});
    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      body,
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ ok: false, message: "Not found" });
    return res.json({ ok: true, product: updated });
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ ok: false, message: "Product ID already exists" });
    }
    return res.status(500).json({ ok: false, message: "Failed to update product" });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ ok: false, message: "Not found" });
    return res.json({ ok: true });
  } catch (e) {
    return res.status(400).json({ ok: false, message: "Invalid id" });
  }
});

module.exports = router;
