const express = require('express');
const { requireAuth } = require('../utils/auth');
const { requireCompanyModule } = require('../core/access/companyAccessGuard');
const ReturnDocument = require('../models/ReturnDocument');
const { getScopedModels, asText, normalizeRole } = require('../services/scopedModels');
const { postReturnDocument } = require('../services/posting/postReturnDocument');

const router = express.Router();
router.use(requireAuth, requireCompanyModule("returns"));

function scopedReturnQuery(req) {
  const role = normalizeRole(req.user?.role);
  const query = { companyId: asText(req.user.companyId) };
  if (role === 'distributor') {
    query.$or = [
      { ownerType: 'distributor', ownerId: asText(req.user.distributorId || req.user.uid) },
      { distributorId: asText(req.user.distributorId || req.user.uid) },
    ];
  }
  if (role === 'customer') {
    query['fromParty.partyId'] = asText(req.user.uid);
  }
  return query;
}

router.get('/', requireAuth, async (req, res) => {
  try {
    const { ReturnDocumentModel } = await getScopedModels(req, { ReturnDocumentModel: ReturnDocument });
    const query = scopedReturnQuery(req);
    if (req.query.returnType && req.query.returnType !== 'all') query.returnType = asText(req.query.returnType);
    if (req.query.status && req.query.status !== 'all') query.status = asText(req.query.status);
    if (req.query.distributorId) query.distributorId = asText(req.query.distributorId);

    const returns = await ReturnDocumentModel.find(query).sort({ createdAt: -1 }).limit(200).lean();
    return res.json({ ok: true, returns });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message || 'Failed to load returns' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const { ReturnDocumentModel } = await getScopedModels(req, { ReturnDocumentModel: ReturnDocument });
    const body = req.body || {};
    const role = normalizeRole(req.user?.role);
    const isDistributorSide = role === 'distributor' || body.ownerType === 'distributor' || body.returnType === 'customer_return';
    const distributorId = asText(body.distributorId || req.user.distributorId || req.user.uid);

    const doc = await ReturnDocumentModel.create({
      companyId: asText(req.user.companyId),
      documentNo: body.documentNo,
      ownerType: isDistributorSide ? 'distributor' : 'company',
      ownerId: isDistributorSide ? distributorId : asText(req.user.companyId),
      distributorId: isDistributorSide ? distributorId : asText(body.distributorId),
      returnType: asText(body.returnType),
      sourceDocumentType: asText(body.sourceDocumentType),
      sourceDocumentId: body.sourceDocumentId || null,
      fromParty: body.fromParty,
      toParty: body.toParty,
      warehouseId: asText(body.warehouseId),
      warehouseName: asText(body.warehouseName),
      status: 'draft',
      reasonCode: asText(body.reasonCode),
      lines: Array.isArray(body.lines) ? body.lines : [],
      totals: body.totals || {},
      createdByUserId: asText(req.user.uid),
      notes: asText(body.notes),
      statusHistory: [{ status: 'draft', changedBy: asText(req.user.uid), note: 'Created' }],
    });

    return res.status(201).json({ ok: true, returnDocument: doc });
  } catch (error) {
    return res.status(400).json({ ok: false, message: error.message || 'Failed to create return document' });
  }
});

router.patch('/:id/status', requireAuth, async (req, res) => {
  try {
    const { ReturnDocumentModel } = await getScopedModels(req, { ReturnDocumentModel: ReturnDocument });
    const allowed = ['draft', 'approved', 'rejected', 'posted', 'reversed'];
    const status = asText(req.body?.status);
    if (!allowed.includes(status)) {
      return res.status(400).json({ ok: false, message: 'Invalid status' });
    }

    const doc = await ReturnDocumentModel.findById(req.params.id);
    if (!doc) return res.status(404).json({ ok: false, message: 'Return document not found' });

    doc.status = status;
    doc.statusHistory.push({ status, changedBy: asText(req.user.uid), note: asText(req.body?.notes || 'Status updated') });
    if (status === 'approved') doc.approvedByUserId = asText(req.user.uid);
    if (req.body?.notes) doc.notes = asText(req.body.notes);
    await doc.save();

    return res.json({ ok: true, returnDocument: doc });
  } catch (error) {
    return res.status(400).json({ ok: false, message: error.message || 'Failed to update return document' });
  }
});

router.post('/:id/post', requireAuth, async (req, res) => {
  try {
    const doc = await postReturnDocument(req, req.params.id);
    return res.json({ ok: true, returnDocument: doc });
  } catch (error) {
    return res.status(400).json({ ok: false, message: error.message || 'Failed to post return document' });
  }
});

module.exports = router;
