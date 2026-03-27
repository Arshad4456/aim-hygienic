const express = require("express");
const Product = require("../models/Product");
const { requireAuth } = require("../utils/auth");
const { syncProductToTenant, removeProductFromTenant, listTenantProductsByCompany } = require("../utils/tenantProducts");

const router = express.Router();

function normalizeRole(role) {
  return String(role || "").trim().toLowerCase();
}

function isSystemLevelAdmin(role) {
  const normalized = normalizeRole(role);
  return normalized === "admin" || normalized === "system admin";
}

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
    minStockLevel: toNumber(body.minStockLevel),
    barcode: String(body.barcode || "").trim(),
    bulkBarcode: String(body.bulkBarcode || "").trim(),
    sku: String(body.sku || "").trim(),
    description: String(body.description || "").trim(),
  };
}

router.post("/", requireAuth, async (req, res) => {
  try {
    const body = normalizePayload(req.body || {});
    const role = req.user?.role;
    if (!isSystemLevelAdmin(role)) {
      body.companyId = String(req.user?.companyId || "").trim();
      body.companyName = String(req.user?.companyName || "").trim();
      if (!body.companyId) return res.status(400).json({ ok: false, message: "Company is required for this role." });
    }
    const doc = await Product.create({ ...body, createdBy: req.user?.uid });
    await syncProductToTenant(doc);
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
    const role = req.user?.role;
    const isSystemAdmin = isSystemLevelAdmin(role);
    const scopedCompanyId = String(req.user?.companyId || "").trim();
    const scopedCompanyName = String(req.user?.companyName || "").trim();
    if (!isSystemAdmin && !scopedCompanyId) {
      return res.status(400).json({ ok: false, message: "Company is required for this role." });
    }

    const operations = [];
    const skipped = [];
    rows.forEach((row, idx) => {
      const normalized = normalizePayload(row || {});
      if (isSystemAdmin) {
        if (!String(normalized.companyId || "").trim()) {
          skipped.push({
            row: idx + 1,
            reason: "Missing Company",
          });
          return;
        }
      } else {
        normalized.companyId = scopedCompanyId;
        normalized.companyName = scopedCompanyName || normalized.companyName;
      }
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
    if (!isSystemLevelAdmin(req.user?.role)) {
      const products = await listTenantProductsByCompany(req.user?.companyId);
      return res.json({ ok: true, products });
    }
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
    if (!isSystemLevelAdmin(req.user?.role)) {
      const scoped = await listTenantProductsByCompany(req.user?.companyId);
      const items = scoped.map((row) => ({
        _id: row._id,
        productId: row.productId,
        name: row.name,
        barcode: row.barcode,
        category: row.category,
        subCategory: row.subCategory,
        size: row.size,
      }));
      return res.json({ ok: true, products: items });
    }
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
    if (!isSystemLevelAdmin(req.user?.role) && String(item.companyId || "").trim() !== String(req.user?.companyId || "").trim()) {
      return res.status(403).json({ ok: false, message: "Forbidden" });
    }
    return res.json({ ok: true, product: item });
  } catch (e) {
    return res.status(400).json({ ok: false, message: "Invalid id" });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const body = normalizePayload(req.body || {});
    const existing = await Product.findById(req.params.id).lean();
    if (!existing) return res.status(404).json({ ok: false, message: "Not found" });
    if (!isSystemLevelAdmin(req.user?.role) && String(existing.companyId || "").trim() !== String(req.user?.companyId || "").trim()) {
      return res.status(403).json({ ok: false, message: "Forbidden" });
    }
    if (!isSystemLevelAdmin(req.user?.role)) {
      body.companyId = String(req.user?.companyId || "").trim();
      body.companyName = String(req.user?.companyName || "").trim();
      if (!body.companyId) return res.status(400).json({ ok: false, message: "Company is required for this role." });
    }
    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      body,
      { new: true, runValidators: true }
    );
    if (!updated) return res.status(404).json({ ok: false, message: "Not found" });
    if (String(existing.companyId || "").trim() && String(existing.companyId || "").trim() !== String(updated.companyId || "").trim()) {
      await removeProductFromTenant(existing);
    }
    await syncProductToTenant(updated);
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
    const existing = await Product.findById(req.params.id).lean();
    if (!existing) return res.status(404).json({ ok: false, message: "Not found" });
    if (!isSystemLevelAdmin(req.user?.role) && String(existing.companyId || "").trim() !== String(req.user?.companyId || "").trim()) {
      return res.status(403).json({ ok: false, message: "Forbidden" });
    }
    await removeProductFromTenant(existing);
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ ok: false, message: "Not found" });
    return res.json({ ok: true });
  } catch (e) {
    return res.status(400).json({ ok: false, message: "Invalid id" });
  }
});

module.exports = router;