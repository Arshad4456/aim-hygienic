const express = require("express");
const router = express.Router();
const Company = require("../models/Company");

// TODO: use your existing auth middleware
const { requireAuth, requireRole } = require("../middleware/auth");

// Create
router.post("/", requireAuth, requireRole("admin"), async (req, res) => {
  const payload = req.body || {};
  if (!payload.code || !payload.name) {
    return res.status(400).json({ message: "Company code and name are required" });
  }

  const exists = await Company.findOne({ code: payload.code.trim() });
  if (exists) return res.status(409).json({ message: "Company code already exists" });

  const item = await Company.create(payload);
  res.json({ ok: true, item });
});

// List
router.get("/", requireAuth, requireRole("admin"), async (req, res) => {
  const items = await Company.find().sort({ createdAt: -1 }).select("code name managerName");
  res.json({ ok: true, items });
});

// Get one
router.get("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const item = await Company.findById(req.params.id);
  if (!item) return res.status(404).json({ message: "Company not found" });
  res.json({ ok: true, item });
});

// Update
router.put("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const item = await Company.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!item) return res.status(404).json({ message: "Company not found" });
  res.json({ ok: true, item });
});

// Delete
router.delete("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const item = await Company.findByIdAndDelete(req.params.id);
  if (!item) return res.status(404).json({ message: "Company not found" });
  res.json({ ok: true });
});

module.exports = router;
