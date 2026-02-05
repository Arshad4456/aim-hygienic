const express = require("express");
const Product = require("../models/Product");
const { requireAuth } = require("../utils/auth");

const router = express.Router();

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

router.post("/", requireAuth, async (req, res) => {
  try {
    const body = req.body || {};
    const doc = await Product.create({
      productId: String(body.productId || "").trim(),
      name: String(body.name || "").trim(),
      companyId: String(body.companyId || "").trim(),
      companyName: String(body.companyName || "").trim(),
      category: String(body.category || "").trim(),
      subCategory: String(body.subCategory || "").trim(),
      size: String(body.size || "").trim(),
      unit: String(body.unit || "").trim(),
      initialPrice: toNumber(body.initialPrice),
      customerPrice: toNumber(body.customerPrice),
      salePrice: toNumber(body.salePrice),
      costPrice: toNumber(body.costPrice),
      sellingPrice: toNumber(body.sellingPrice),
      minStockLevel: toNumber(body.minStockLevel),
      barcode: String(body.barcode || "").trim(),
      sku: String(body.sku || "").trim(),
      description: String(body.description || "").trim(),
      createdBy: req.user?.uid,
    });
    return res.status(201).json({ ok: true, product: doc });
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ ok: false, message: "Product ID already exists" });
    }
    return res.status(500).json({ ok: false, message: "Failed to create product" });
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
    const body = req.body || {};
    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      {
        productId: String(body.productId || "").trim(),
        name: String(body.name || "").trim(),
        companyId: String(body.companyId || "").trim(),
        companyName: String(body.companyName || "").trim(),
      category: String(body.category || "").trim(),
      subCategory: String(body.subCategory || "").trim(),
      size: String(body.size || "").trim(),
      unit: String(body.unit || "").trim(),
      initialPrice: toNumber(body.initialPrice),
      customerPrice: toNumber(body.customerPrice),
      salePrice: toNumber(body.salePrice),
      costPrice: toNumber(body.costPrice),
      sellingPrice: toNumber(body.sellingPrice),
      minStockLevel: toNumber(body.minStockLevel),
      barcode: String(body.barcode || "").trim(),
        sku: String(body.sku || "").trim(),
        description: String(body.description || "").trim(),
      },
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