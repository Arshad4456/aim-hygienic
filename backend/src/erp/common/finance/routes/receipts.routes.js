const express = require('express');
const { requireAuth } = require('../../../platform/auth/utils/auth');
const { requireCompanyModule } = require('../../../platform/access/permissions/companyAccessGuard');
const CustomerReceipt = require('../models/CustomerReceipt');
const CustomerInvoice = require('../models/CustomerInvoice');
const CompanyReceiptFromDistributor = require('../models/CompanyReceiptFromDistributor');
const CompanyInvoiceToDistributor = require('../models/CompanyInvoiceToDistributor');
const CompanySalesOrder = require('../../../distribution/sales/models/CompanySalesOrder');
const SecondaryOrder = require('../../../distribution/sales/models/SecondaryOrder');
const { getScopedModels, asText, normalizeRole } = require('../../../platform/tenancy/services/scopedModels');
const { postCustomerReceipt } = require('../workflows/posting/postCustomerReceipt');
const { postCustomerInvoice } = require('../workflows/posting/postCustomerInvoice');
const { postCompanyInvoiceToDistributor } = require('../workflows/posting/postCompanyInvoiceToDistributor');
const { postCompanyReceiptFromDistributor } = require('../workflows/posting/postCompanyReceiptFromDistributor');

const router = express.Router();
router.use(requireAuth, requireCompanyModule("receipts"));

function resolveReceiptFamily(req) {
  const family = asText(req.query.family || req.body.family || '').toLowerCase();
  if (family === 'company_distributor') return 'company_distributor';
  if (family === 'distributor_customer') return 'distributor_customer';

  const role = normalizeRole(req.user?.role);
  return role === 'distributor' || role === 'customer' || role.includes('order') || role === 'salesman'
    ? 'distributor_customer'
    : 'company_distributor';
}

function normalizeInvoiceBody(body = {}, req, family) {
  const total = Number(body.invoiceTotal || body.totals?.grandTotal || 0);
  const common = {
    companyId: asText(req.user.companyId),
    documentNo: body.documentNo,
    invoiceDate: body.invoiceDate ? new Date(body.invoiceDate) : new Date(),
    dueDate: body.dueDate ? new Date(body.dueDate) : null,
    status: 'draft',
    lines: Array.isArray(body.lines) ? body.lines : [],
    totals: body.totals || {},
    invoiceTotal: total,
    balanceAmount: total,
    createdByUserId: asText(req.user.uid),
    notes: asText(body.notes),
    statusHistory: [{ status: 'draft', changedBy: asText(req.user.uid), note: 'Created' }],
  };

  if (family === 'company_distributor') {
    return {
      ...common,
      ownerId: asText(req.user.companyId),
      distributorId: asText(body.distributorId),
      distributor: body.distributor,
      companySalesOrderId: body.companySalesOrderId || null,
    };
  }

  return {
    ...common,
    ownerId: asText(body.distributorId || req.user.distributorId || req.user.uid),
    distributorId: asText(body.distributorId || req.user.distributorId || req.user.uid),
    customer: body.customer,
    secondaryOrderId: body.secondaryOrderId || null,
  };
}

function buildReceiptBaseQuery(req, family) {
  const query = { companyId: asText(req.user.companyId) };
  const role = normalizeRole(req.user?.role);
  if (family === 'company_distributor') {
    if (req.query.distributorId) query.distributorId = asText(req.query.distributorId);
    return query;
  }
  if (role === 'distributor') query.distributorId = asText(req.user.distributorId || req.user.uid);
  if (role === 'customer') query['customer.partyId'] = asText(req.user.uid);
  if (req.query.distributorId) query.distributorId = asText(req.query.distributorId);
  if (req.query.customerId) query['customer.partyId'] = asText(req.query.customerId);
  return query;
}

router.get('/', requireAuth, async (req, res) => {
  try {
    const family = resolveReceiptFamily(req);

    if (family === 'company_distributor') {
      const { CompanyReceiptFromDistributorModel } = await getScopedModels(req, {
        CompanyReceiptFromDistributorModel: CompanyReceiptFromDistributor,
      });
      const query = buildReceiptBaseQuery(req, family);
      if (req.query.status && req.query.status !== 'all') query.status = asText(req.query.status);

      const receipts = await CompanyReceiptFromDistributorModel.find(query).sort({ createdAt: -1 }).lean();
      return res.json({ ok: true, family, receipts });
    }

    const { CustomerReceiptModel } = await getScopedModels(req, { CustomerReceiptModel: CustomerReceipt });
    const query = buildReceiptBaseQuery(req, family);
    if (req.query.status && req.query.status !== 'all') query.status = asText(req.query.status);

    const receipts = await CustomerReceiptModel.find(query).sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, family, receipts });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message || 'Failed to load receipts' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const family = resolveReceiptFamily(req);
    const body = req.body || {};

    if (family === 'company_distributor') {
      const { CompanyReceiptFromDistributorModel } = await getScopedModels(req, {
        CompanyReceiptFromDistributorModel: CompanyReceiptFromDistributor,
      });

      const receipt = await CompanyReceiptFromDistributorModel.create({
        companyId: asText(req.user.companyId),
        documentNo: body.documentNo,
        ownerId: asText(req.user.companyId),
        distributorId: asText(body.distributorId),
        payer: body.payer,
        paymentDate: body.paymentDate ? new Date(body.paymentDate) : new Date(),
        amount: Number(body.amount || 0),
        paymentMethod: asText(body.paymentMethod),
        toAccountId: asText(body.toAccountId),
        status: 'pending',
        allocations: Array.isArray(body.allocations) ? body.allocations : [],
        attachmentUrl: asText(body.attachmentUrl),
        referenceNo: asText(body.referenceNo),
        createdByUserId: asText(req.user.uid),
        notes: asText(body.notes),
        statusHistory: [{ status: 'pending', changedBy: asText(req.user.uid), note: 'Created' }],
      });

      return res.status(201).json({ ok: true, family, receipt });
    }

    const { CustomerReceiptModel } = await getScopedModels(req, { CustomerReceiptModel: CustomerReceipt });
    const receipt = await CustomerReceiptModel.create({
      companyId: asText(req.user.companyId),
      documentNo: body.documentNo,
      ownerId: asText(body.distributorId || req.user.distributorId || req.user.uid),
      distributorId: asText(body.distributorId || req.user.distributorId || req.user.uid),
      customer: body.customer,
      paymentDate: body.paymentDate ? new Date(body.paymentDate) : new Date(),
      amount: Number(body.amount || 0),
      paymentMethod: asText(body.paymentMethod),
      toAccountId: asText(body.toAccountId),
      status: 'pending',
      allocations: Array.isArray(body.allocations) ? body.allocations : [],
      attachmentUrl: asText(body.attachmentUrl),
      referenceNo: asText(body.referenceNo),
      createdByUserId: asText(req.user.uid),
      notes: asText(body.notes),
      statusHistory: [{ status: 'pending', changedBy: asText(req.user.uid), note: 'Created' }],
    });

    return res.status(201).json({ ok: true, family, receipt });
  } catch (error) {
    return res.status(400).json({ ok: false, message: error.message || 'Failed to create receipt' });
  }
});

router.post('/:id/post', requireAuth, async (req, res) => {
  try {
    const family = resolveReceiptFamily(req);
    const receipt = family === 'company_distributor'
      ? await postCompanyReceiptFromDistributor(req, req.params.id)
      : await postCustomerReceipt(req, req.params.id);

    return res.json({ ok: true, family, receipt });
  } catch (error) {
    return res.status(400).json({ ok: false, message: error.message || 'Failed to post receipt' });
  }
});

router.get('/invoices', requireAuth, async (req, res) => {
  try {
    const family = resolveReceiptFamily(req);
    if (family === 'company_distributor') {
      const { CompanyInvoiceToDistributorModel } = await getScopedModels(req, {
        CompanyInvoiceToDistributorModel: CompanyInvoiceToDistributor,
      });
      const query = buildReceiptBaseQuery(req, family);
      if (req.query.paymentStatus && req.query.paymentStatus !== 'all') query.paymentStatus = asText(req.query.paymentStatus);
      const invoices = await CompanyInvoiceToDistributorModel.find(query).sort({ createdAt: -1 }).lean();
      return res.json({ ok: true, family, invoices });
    }

    const { CustomerInvoiceModel } = await getScopedModels(req, { CustomerInvoiceModel: CustomerInvoice });
    const query = buildReceiptBaseQuery(req, family);
    if (req.query.paymentStatus && req.query.paymentStatus !== 'all') query.paymentStatus = asText(req.query.paymentStatus);
    const invoices = await CustomerInvoiceModel.find(query).sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, family, invoices });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message || 'Failed to load invoices' });
  }
});

router.post('/invoices', requireAuth, async (req, res) => {
  try {
    const family = resolveReceiptFamily(req);
    const body = req.body || {};

    if (family === 'company_distributor') {
      const { CompanyInvoiceToDistributorModel } = await getScopedModels(req, {
        CompanyInvoiceToDistributorModel: CompanyInvoiceToDistributor,
      });
      const invoice = await CompanyInvoiceToDistributorModel.create(normalizeInvoiceBody(body, req, family));
      return res.status(201).json({ ok: true, family, invoice });
    }

    const { CustomerInvoiceModel } = await getScopedModels(req, { CustomerInvoiceModel: CustomerInvoice });
    const invoice = await CustomerInvoiceModel.create(normalizeInvoiceBody(body, req, family));
    return res.status(201).json({ ok: true, family, invoice });
  } catch (error) {
    return res.status(400).json({ ok: false, message: error.message || 'Failed to create invoice' });
  }
});

router.post('/invoices/:id/post', requireAuth, async (req, res) => {
  try {
    const family = resolveReceiptFamily(req);
    const invoice = family === 'company_distributor'
      ? await postCompanyInvoiceToDistributor(req, req.params.id)
      : await postCustomerInvoice(req, req.params.id);

    return res.json({ ok: true, family, invoice });
  } catch (error) {
    return res.status(400).json({ ok: false, message: error.message || 'Failed to post invoice' });
  }
});

router.get('/orders/open', requireAuth, async (req, res) => {
  try {
    const family = resolveReceiptFamily(req);
    if (family === 'company_distributor') {
      const { CompanySalesOrderModel } = await getScopedModels(req, { CompanySalesOrderModel: CompanySalesOrder });
      const query = { companyId: asText(req.user.companyId) };
      if (req.query.distributorId) query.distributorId = asText(req.query.distributorId);
      query.status = { $in: ['received', 'dispatched', 'approved', 'reserved', 'ready_to_dispatch', 'invoiced'] };
      const orders = await CompanySalesOrderModel.find(query).sort({ createdAt: -1 }).lean();
      return res.json({ ok: true, family, orders });
    }

    const { SecondaryOrderModel } = await getScopedModels(req, { SecondaryOrderModel: SecondaryOrder });
    const query = buildReceiptBaseQuery(req, family);
    query.status = { $in: ['approved', 'reserved', 'dispatched', 'delivered', 'invoiced'] };
    const orders = await SecondaryOrderModel.find(query).sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, family, orders });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message || 'Failed to load billable orders' });
  }
});

module.exports = router;
