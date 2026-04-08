const express = require("express");
const Product = require("../models/Product");
const { requireAuth } = require("../utils/auth");
const { createProductInTenant, updateProductInTenant, deleteProductFromTenant, listTenantProductsByCompany, findTenantProductById } = require("../utils/tenantProducts");
const { listAllTenantTargets, getTenantModel } = require("../utils/tenantModels");

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

function normalizeCompanyScope(req, body = {}) {
  if (isSystemLevelAdmin(req.user?.role)) {
    return {
      companyId: String(body.companyId || req.query.companyId || "").trim(),
      companyName: String(body.companyName || req.query.companyName || "").trim(),
    };
  }
  return {
    companyId: String(req.user?.companyId || "").trim(),
    companyName: String(req.user?.companyName || "").trim(),
  };
}

async function listAllTenantProducts() {
  const items = [];
  const targets = await listAllTenantTargets();
  for (const target of targets) {
    const TenantProduct = await getTenantModel(Product, target.companyId, target.companyName);
    if (!TenantProduct) continue;
    const rows = await TenantProduct.find({}).lean();
    if (rows?.length) items.push(...rows);
  }
  return items;
}

async function findScopedProductById(id, req, explicitCompany = {}) {
  const companyId = explicitCompany.companyId || req.user?.companyId || req.query.companyId || "";
  const companyName = explicitCompany.companyName || req.user?.companyName || req.query.companyName || "";
  if (String(companyId || "").trim()) {
    const scoped = await findTenantProductById(id, companyId, companyName);
    if (scoped?.doc) return { product: scoped.doc, isTenant: true, companyId: scoped.companyId, companyName: scoped.companyName };
  }
  if (isSystemLevelAdmin(req.user?.role)) {
    const anyTenant = await findTenantProductById(id);
    if (anyTenant?.doc) return { product: anyTenant.doc, isTenant: true, companyId: anyTenant.companyId, companyName: anyTenant.companyName };
  }
  const legacy = await Product.findById(id).lean();
  if (legacy) return { product: legacy, isTenant: false, companyId: legacy.companyId, companyName: legacy.companyName };
  return { product: null, isTenant: false, companyId: "", companyName: "" };
}

router.post("/", requireAuth, async (req, res) => {
  try {
    const body = normalizePayload(req.body || {});
    const scope = normalizeCompanyScope(req, body);
    body.companyId = scope.companyId;
    body.companyName = scope.companyName || body.companyName;
    if (!body.companyId) {
      return res.status(400).json({ ok: false, message: "Company is required for this role." });
    }
    const doc = await createProductInTenant({ ...body, createdBy: req.user?.uid });
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

    const skipped = [];
    let processed = 0;
    let inserted = 0;
    let updated = 0;

    for (const [idx, row] of rows.entries()) {
      const normalized = normalizePayload(row || {});
      const scope = normalizeCompanyScope(req, normalized);
      normalized.companyId = scope.companyId;
      normalized.companyName = scope.companyName || normalized.companyName;
      if (!normalized.companyId) {
        skipped.push({ row: idx + 1, reason: "Missing Company" });
        continue;
      }
      if (!normalized.productId || !normalized.name) {
        skipped.push({ row: idx + 1, reason: "Missing Product ID or Product Name" });
        continue;
      }

      const TenantProduct = await getTenantModel(Product, normalized.companyId, normalized.companyName);
      const existing = await TenantProduct.findOne({ productId: normalized.productId }).lean();
      if (existing) {
        await TenantProduct.findByIdAndUpdate(existing._id, normalized, { new: true, runValidators: true });
        updated += 1;
      } else {
        await TenantProduct.create({ ...normalized, createdBy: req.user?.uid });
        inserted += 1;
      }
      processed += 1;
    }

    return res.json({
      ok: true,
      summary: { received: rows.length, processed, inserted, updated, skipped: skipped.length },
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
    if (req.query.companyId) {
      let products = await listTenantProductsByCompany(req.query.companyId);
      if (req.query.category) products = products.filter((row) => String(row.category || "") === String(req.query.category));
      if (req.query.subCategory) products = products.filter((row) => String(row.subCategory || "") === String(req.query.subCategory));
      return res.json({ ok: true, products });
    }
    const items = await listAllTenantProducts();
    return res.json({ ok: true, products: items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)) });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load products" });
  }
});

router.get("/barcodes", requireAuth, async (req, res) => {
  try {
    const source = !isSystemLevelAdmin(req.user?.role)
      ? await listTenantProductsByCompany(req.user?.companyId)
      : req.query.companyId
        ? await listTenantProductsByCompany(req.query.companyId)
        : await listAllTenantProducts();

    const items = source.map((row) => ({
      _id: row._id,
      productId: row.productId,
      name: row.name,
      barcode: row.barcode,
      category: row.category,
      subCategory: row.subCategory,
      size: row.size,
    }));
    return res.json({ ok: true, products: items });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load barcodes" });
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  try {
    const scoped = await findScopedProductById(req.params.id, req);
    const item = scoped.product;
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
    const scoped = await findScopedProductById(req.params.id, req, normalizeCompanyScope(req, body));
    const existing = scoped.product;
    if (!existing) return res.status(404).json({ ok: false, message: "Not found" });
    if (!isSystemLevelAdmin(req.user?.role) && String(existing.companyId || "").trim() !== String(req.user?.companyId || "").trim()) {
      return res.status(403).json({ ok: false, message: "Forbidden" });
    }

    const nextScope = normalizeCompanyScope(req, body);
    body.companyId = nextScope.companyId || existing.companyId;
    body.companyName = nextScope.companyName || body.companyName || existing.companyName;
    if (!body.companyId) return res.status(400).json({ ok: false, message: "Company is required for this role." });

    let updated;
    if (scoped.isTenant && body.companyId === scoped.companyId) {
      updated = await updateProductInTenant(req.params.id, body, scoped.companyId, scoped.companyName);
    } else {
      const TenantProduct = await getTenantModel(Product, body.companyId, body.companyName);
      updated = await TenantProduct.findOneAndUpdate({ _id: existing._id }, { $set: { ...existing, ...body } }, { new: true, upsert: true, runValidators: true });
      if (scoped.isTenant) {
        await deleteProductFromTenant(existing._id, scoped.companyId, scoped.companyName);
      } else {
        await Product.findByIdAndDelete(existing._id);
      }
    }

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
    const scoped = await findScopedProductById(req.params.id, req);
    const existing = scoped.product;
    if (!existing) return res.status(404).json({ ok: false, message: "Not found" });
    if (!isSystemLevelAdmin(req.user?.role) && String(existing.companyId || "").trim() !== String(req.user?.companyId || "").trim()) {
      return res.status(403).json({ ok: false, message: "Forbidden" });
    }
    if (scoped.isTenant) {
      await deleteProductFromTenant(existing._id, scoped.companyId, scoped.companyName);
    } else {
      await Product.findByIdAndDelete(existing._id);
    }
    return res.json({ ok: true });
  } catch (e) {
    return res.status(400).json({ ok: false, message: "Invalid id" });
  }
});

module.exports = router;
