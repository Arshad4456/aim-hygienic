const express = require("express");
const { requireAuth } = require("../utils/auth");
const User = require("../models/User");

const router = express.Router();

function normalizeCoordinate(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

router.get("/users", requireAuth, async (req, res) => {
  try {
    const users = await User.find({
      gpsLatitude: { $ne: "" },
      gpsLongitude: { $ne: "" },
    })
      .select("fullName role mobile gpsLatitude gpsLongitude regionName zoneName areaName updatedAt")
      .lean();

    return res.json({
      ok: true,
      users: users.map((user) => ({
        ...user,
        gpsLatitude: normalizeCoordinate(user.gpsLatitude),
        gpsLongitude: normalizeCoordinate(user.gpsLongitude),
      })),
    });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load live tracking" });
  }
});

router.put("/users/me", requireAuth, async (req, res) => {
  try {
    const body = req.body || {};
    const gpsLatitude = normalizeCoordinate(body.gpsLatitude);
    const gpsLongitude = normalizeCoordinate(body.gpsLongitude);

    if (gpsLatitude === null || gpsLongitude === null) {
      return res.status(400).json({ ok: false, message: "Invalid coordinates" });
    }

    const updated = await User.findByIdAndUpdate(
      req.user.uid,
      {
        gpsLatitude: String(gpsLatitude),
        gpsLongitude: String(gpsLongitude),
      },
      { new: true }
    ).select("fullName role mobile gpsLatitude gpsLongitude updatedAt");

    return res.json({ ok: true, user: updated });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to update location" });
  }
});

router.get("/summary", requireAuth, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const trackedUsers = await User.countDocuments({
      gpsLatitude: { $ne: "" },
      gpsLongitude: { $ne: "" },
    });
    const activeUsers = await User.countDocuments({ status: "active" });

    return res.json({
      ok: true,
      summary: {
        totalUsers,
        trackedUsers,
        activeUsers,
      },
    });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Failed to load tracking summary" });
  }
});

module.exports = router;
