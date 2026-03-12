const express = require("express");
const User = require("../models/User");
const { requireAuth } = require("../utils/auth");
const {
  listCompanyDocumentTemplates,
  getDefaultCompanyDocumentTemplate,
} = require("../services/companyDocumentTemplateService");

const router = express.Router();

async function resolveCompanyIdFromUser(auth) {
  const user = await User.findById(auth.uid).select("companyId role isSuperAdmin").lean();
  if (!user) {
    const error = new Error("Authenticated user not found");
    error.status = 404;
    throw error;
  }

  if (auth.isSuperAdmin || user.isSuperAdmin) {
    const error = new Error("Super admin is not linked to a single company for runtime document templates");
    error.status = 400;
    throw error;
  }

  const companyId = String(user.companyId || "").trim();
  if (!companyId) {
    const error = new Error("User is not linked to a company");
    error.status = 400;
    throw error;
  }

  return companyId;
}

router.get("/document-templates", requireAuth, async (req, res) => {
  try {
    const companyId = await resolveCompanyIdFromUser(req.user);
    const templates = await listCompanyDocumentTemplates(companyId, {
      documentType: req.query.documentType,
    });

    return res.json({ success: true, templates });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message || "Failed to load document templates" });
  }
});

router.get("/document-templates/default", requireAuth, async (req, res) => {
  try {
    const companyId = await resolveCompanyIdFromUser(req.user);
    const [invoiceTemplate, receiptTemplate] = await Promise.all([
      getDefaultCompanyDocumentTemplate(companyId, "invoice"),
      getDefaultCompanyDocumentTemplate(companyId, "receipt"),
    ]);

    return res.json({ success: true, invoiceTemplate, receiptTemplate });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to load default document templates",
    });
  }
});

router.get("/document-templates/default/:documentType", requireAuth, async (req, res) => {
  try {
    const companyId = await resolveCompanyIdFromUser(req.user);
    const template = await getDefaultCompanyDocumentTemplate(companyId, req.params.documentType);

    return res.json({ success: true, template });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to load default document template",
    });
  }
});

module.exports = router;
