const express = require("express");
const DocumentTemplatePreset = require("../../models/DocumentTemplatePreset");
const CompanySetupTemplate = require("../../models/CompanySetupTemplate");
const { createCompanyDocumentTemplate, listCompanyDocumentTemplates, getCompanyDocumentTemplate, updateCompanyDocumentTemplate, applyPresetToCompany } = require("../../services/companyDocumentTemplateService");
const { createSetupTemplateFromCompany, applySetupTemplateToCompany, cloneCompanyConfiguration } = require("../../services/companySetupTemplateService");
const { buildAuditContext, fireAndForgetAudit, ensureCompanyOrThrow } = require("./common");
const { logDocumentTemplateChange, logSetupTemplateApplied } = require("../../services/platformAuditLogService");

const router = express.Router();

router.post('/companies/:companyId/document-templates', async (req, res) => {
  try {
    await ensureCompanyOrThrow(req.params.companyId);
    const template = await createCompanyDocumentTemplate(req.params.companyId, req.body || {}, req.user?.uid || req.user?._id);
    fireAndForgetAudit(logDocumentTemplateChange(buildAuditContext(req), req.params.companyId, 'created', template));
    return res.status(201).json({ success: true, template });
  } catch (error) { return res.status(error.status || 500).json({ success: false, message: error.message || 'Failed to create document template' }); }
});
router.get('/companies/:companyId/document-templates', async (req, res) => { try { return res.json({ success: true, templates: await listCompanyDocumentTemplates(req.params.companyId, req.query || {}) }); } catch (error) { return res.status(error.status || 500).json({ success: false, message: error.message || 'Failed to list document templates' }); } });
router.get('/companies/:companyId/document-templates/:templateId', async (req, res) => { try { return res.json({ success: true, template: await getCompanyDocumentTemplate(req.params.companyId, req.params.templateId) }); } catch (error) { return res.status(error.status || 500).json({ success: false, message: error.message || 'Failed to load document template' }); } });
router.put('/companies/:companyId/document-templates/:templateId', async (req, res) => {
  try {
    const template = await updateCompanyDocumentTemplate(req.params.companyId, req.params.templateId, req.body || {}, req.user?.uid || req.user?._id);
    fireAndForgetAudit(logDocumentTemplateChange(buildAuditContext(req), req.params.companyId, 'updated', template));
    return res.json({ success: true, template });
  } catch (error) { return res.status(error.status || 500).json({ success: false, message: error.message || 'Failed to update document template' }); }
});
router.post('/companies/:companyId/document-templates/apply-preset', async (req, res) => {
  try {
    const template = await applyPresetToCompany(req.params.companyId, req.body?.presetId, Boolean(req.body?.isDefault), req.user?.uid || req.user?._id);
    fireAndForgetAudit(logDocumentTemplateChange(buildAuditContext(req), req.params.companyId, 'preset_applied', template));
    return res.json({ success: true, template });
  } catch (error) { return res.status(error.status || 500).json({ success: false, message: error.message || 'Failed to apply preset' }); }
});

router.post('/document-template-presets', async (req, res) => {
  try {
    const body = req.body || {};
    const preset = await DocumentTemplatePreset.create(body);
    return res.status(201).json({ success: true, preset });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ success: false, message: 'Preset code already exists' });
    return res.status(500).json({ success: false, message: error.message || 'Failed to create preset' });
  }
});
router.get('/document-template-presets', async (_req, res) => res.json({ success: true, presets: await DocumentTemplatePreset.find().sort({ documentType: 1, templateName: 1 }).lean() }));
router.get('/document-template-presets/:presetId', async (req, res) => { const preset = await DocumentTemplatePreset.findById(req.params.presetId).lean(); if (!preset) return res.status(404).json({ success: false, message: 'Preset not found' }); return res.json({ success: true, preset }); });
router.put('/document-template-presets/:presetId', async (req, res) => { const preset = await DocumentTemplatePreset.findByIdAndUpdate(req.params.presetId, req.body || {}, { new: true, runValidators: true }); if (!preset) return res.status(404).json({ success: false, message: 'Preset not found' }); return res.json({ success: true, preset }); });

router.post('/companies/:companyId/save-as-template', async (req, res) => {
  try {
    const template = await createSetupTemplateFromCompany(req.params.companyId, req.body || {}, req.user?.uid || req.user?._id);
    fireAndForgetAudit(logSetupTemplateApplied(buildAuditContext(req), req.params.companyId, 'saved', template));
    return res.status(201).json({ success: true, template });
  } catch (error) { return res.status(error.status || 500).json({ success: false, message: error.message || 'Failed to save setup template' }); }
});
router.get('/setup-templates', async (_req, res) => res.json({ success: true, templates: await CompanySetupTemplate.find({ isActive: true }).sort({ createdAt: -1 }).lean() }));
router.get('/setup-templates/:templateId', async (req, res) => { const template = await CompanySetupTemplate.findById(req.params.templateId).lean(); if (!template) return res.status(404).json({ success: false, message: 'Setup template not found' }); return res.json({ success: true, template }); });
router.post('/companies/:companyId/apply-setup-template', async (req, res) => {
  try {
    const result = await applySetupTemplateToCompany(req.params.companyId, req.body?.templateId, req.body || {}, req.user?.uid || req.user?._id);
    fireAndForgetAudit(logSetupTemplateApplied(buildAuditContext(req), req.params.companyId, 'applied', result));
    return res.json({ success: true, ...result });
  } catch (error) { return res.status(error.status || 500).json({ success: false, message: error.message || 'Failed to apply setup template' }); }
});
router.post('/companies/:companyId/clone-from-company', async (req, res) => {
  try {
    const result = await cloneCompanyConfiguration(req.body?.sourceCompanyId, req.params.companyId, req.body || {}, req.user?.uid || req.user?._id);
    fireAndForgetAudit(logSetupTemplateApplied(buildAuditContext(req), req.params.companyId, 'cloned', result));
    return res.json({ success: true, ...result });
  } catch (error) { return res.status(error.status || 500).json({ success: false, message: error.message || 'Failed to clone company configuration' }); }
});

module.exports = router;
