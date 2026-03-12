const User = require("../models/User");
const { requireAuth } = require("../utils/auth");

async function requireSuperAdmin(req, res, next) {
  requireAuth(req, res, async () => {
    try {
      if (req.user?.isSuperAdmin === true) {
        return next();
      }

      if (!req.user?.uid) {
        return res.status(403).json({ ok: false, message: "Forbidden" });
      }

      const authUser = await User.findById(req.user.uid).select("isSuperAdmin").lean();
      if (!authUser?.isSuperAdmin) {
        return res.status(403).json({ ok: false, message: "Forbidden" });
      }

      req.user.isSuperAdmin = true;
      return next();
    } catch (_error) {
      return res.status(500).json({ ok: false, message: "Authorization check failed" });
    }
  });
}

module.exports = { requireSuperAdmin };
