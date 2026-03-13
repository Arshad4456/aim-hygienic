const express = require("express");
const User = require("../models/User");
const SalesOrder = require("../models/SalesOrder");
const Receipt = require("../models/Receipt");
const { requireAuth } = require("../utils/auth");
const {
  listCompanyDocumentTemplates,
  getDefaultCompanyDocumentTemplate,
} = require("../services/companyDocumentTemplateService");

const router = express.Router();

function normalizeRole(role) {
  return String(role || "").trim().toLowerCase();
}

async function resolveAuthUser(auth) {
  const user = await User.findById(auth.uid).select("companyId role isSuperAdmin userId distributorId customerId").lean();
  if (!user) {
    const error = new Error("Authenticated user not found");
    error.status = 404;
    throw error;
  }
  return user;
}

async function resolveCompanyIdFromUser(auth) {
  const user = await resolveAuthUser(auth);

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

function normalizeInvoiceDocument(order) {
  const items = Array.isArray(order?.items)
    ? order.items.map((item) => {
        const qty = Number(item.totalPacks || item.quantity || 0);
        const rate = Number(item.onePackPrice || item.unitPrice || 0);
        return {
          productName: item.productName || "-",
          quantity: qty,
          unitPrice: rate,
          amount: qty * rate,
        };
      })
    : [];

  return {
    id: String(order?._id || ""),
    documentNo: order.orderNo || order.invoiceNo || String(order?._id || ""),
    documentDate: order.updatedAt || order.createdAt || null,
    customerName: order.distributorName || order.customerName || order.distributorId || "-",
    companyName: order.toWarehouseName || order.fromEntityName || "",
    territoryName: order.territoryName || order.areaName || "",
    saleType: order.saleType || "",
    items,
    totals: {
      totalAmount: Number(order.totalAmount || items.reduce((sum, item) => sum + Number(item.amount || 0), 0)),
    },
    notes: order.notes || "",
    status: order.status || "",
    raw: order,
  };
}

function normalizeReceiptDocument(receipt) {
  return {
    id: String(receipt?._id || ""),
    documentNo: receipt.receiptNo || String(receipt?._id || ""),
    documentDate: receipt.paymentDate || receipt.createdAt || null,
    customerName: receipt.payerName || "-",
    companyName: "",
    items: [],
    totals: {
      totalAmount: Number(receipt.amount || 0),
    },
    notes: receipt.notes || "",
    status: receipt.status || "",
    paymentMethod: receipt.paymentMethod || "",
    payerRole: receipt.payerRole || "",
    paidTo: receipt.paymentMethod === "online" ? receipt.paidToAccountId?.accountName || "-" : receipt.receivedByUserId?.fullName || receipt.receivedByName || "-",
    linkedInvoiceNo: receipt.linkedInvoiceNo || "",
    referenceNo: receipt.referenceNo || "",
    raw: receipt,
  };
}

function canViewInvoice(authUser, order) {
  const role = normalizeRole(authUser.role);
  if (role === "admin") return true;
  const uid = String(authUser._id || "");
  const userId = String(authUser.userId || "").trim();
  const distributorId = String(authUser.distributorId || "").trim();
  const customerId = String(authUser.customerId || "").trim();

  return (
    String(order.createdBy || "") === uid ||
    (userId && [order.customerId, order.distributorId, order.salesmanId, order.orderBookerId].includes(userId)) ||
    (distributorId && String(order.distributorId || "").trim() === distributorId) ||
    (customerId && String(order.customerId || "").trim() === customerId)
  );
}

function canViewReceipt(authUser, receipt) {
  const role = normalizeRole(authUser.role);
  if (role === "admin") return true;
  return String(receipt.payerUserId || "") === String(authUser._id || "") || String(receipt.createdByUserId || "") === String(authUser._id || "");
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

router.get("/documents/invoice/:id", requireAuth, async (req, res) => {
  try {
    const authUser = await resolveAuthUser(req.user);
    const order = await SalesOrder.findById(req.params.id).lean();
    if (!order) return res.status(404).json({ success: false, message: "Invoice not found" });
    if (!canViewInvoice(authUser, order)) return res.status(403).json({ success: false, message: "Forbidden" });

    return res.json({ success: true, document: normalizeInvoiceDocument(order) });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message || "Failed to load invoice document" });
  }
});

router.get("/documents/receipt/:id", requireAuth, async (req, res) => {
  try {
    const authUser = await resolveAuthUser(req.user);
    const receipt = await Receipt.findById(req.params.id)
      .populate("paidToAccountId", "accountName")
      .populate("receivedByUserId", "fullName")
      .lean();

    if (!receipt) return res.status(404).json({ success: false, message: "Receipt not found" });
    if (!canViewReceipt(authUser, receipt)) return res.status(403).json({ success: false, message: "Forbidden" });

    return res.json({ success: true, document: normalizeReceiptDocument(receipt) });
  } catch (error) {
    return res.status(error.status || 500).json({ success: false, message: error.message || "Failed to load receipt document" });
  }
});

module.exports = router;