"use client";

import { useEffect, useMemo, useState } from "react";
import PageHeader from "../../../components/foundation/PageHeader";
import SectionCard from "../../../components/foundation/SectionCard";
import ModuleCardStrip from "../../../components/foundation/ModuleCardStrip";
import StatusBadge from "../../../components/foundation/StatusBadge";
import DocumentTable from "../../../components/foundation/DocumentTable";
import EmptyState from "../../../components/foundation/EmptyState";
import DocumentViewerModal from "../../../components/foundation/DocumentViewerModal";
import { v2Api } from "../../../lib/api";

const SECTION_ITEMS = [
  { key: "overview", title: "Finance Overview", description: "Company receivables, payables, balances, and settlement status." },
  { key: "invoices", title: "Distributor Invoices", description: "Create and track company invoices issued to distributors." },
  { key: "receipts", title: "Distributor Receipts", description: "Post receipts from distributors and allocate against open invoices." },
  { key: "payments", title: "Supplier Bills & Payments", description: "Track supplier invoices, payments, and outstanding vendor liability." },
  { key: "aging", title: "Aging & Account Balances", description: "Open receivables and payables by age bucket plus cash and bank balances." },
];

function safeNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatCurrency(value) {
  return `PKR ${safeNumber(value).toLocaleString()}`;
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function nextDoc(prefix) {
  return `${prefix}-${Date.now()}`;
}

function buildDocumentUrl(title, rows = [], meta = {}) {
  const itemsHtml = rows
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.label)}</td>
          <td>${escapeHtml(row.value)}</td>
        </tr>
      `,
    )
    .join("");

  const metaHtml = Object.entries(meta || {})
    .map(([key, value]) => `<div><strong>${escapeHtml(key)}:</strong> ${escapeHtml(value)}</div>`)
    .join("");

  const html = `
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
          h1 { margin: 0 0 16px; font-size: 24px; }
          .meta { margin-bottom: 16px; color: #4b5563; line-height: 1.7; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { border: 1px solid #d1d5db; padding: 10px; text-align: left; font-size: 14px; }
          th { background: #f3f4f6; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(title)}</h1>
        <div class="meta">${metaHtml}</div>
        <table>
          <thead><tr><th>Field</th><th>Value</th></tr></thead>
          <tbody>${itemsHtml}</tbody>
        </table>
      </body>
    </html>
  `;

  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function computeAgingBuckets(invoices = []) {
  const today = new Date();
  const buckets = { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90_plus: 0, total: 0 };

  for (const invoice of invoices) {
    const remaining = safeNumber(invoice?.balanceAmount || invoice?.invoiceTotal);
    if (remaining <= 0) continue;
    buckets.total += remaining;
    const dueDate = new Date(invoice?.dueDate || invoice?.invoiceDate || invoice?.createdAt || today);
    const days = Math.floor((today.getTime() - dueDate.getTime()) / 86400000);
    if (days <= 0) buckets.current += remaining;
    else if (days <= 30) buckets.d1_30 += remaining;
    else if (days <= 60) buckets.d31_60 += remaining;
    else if (days <= 90) buckets.d61_90 += remaining;
    else buckets.d90_plus += remaining;
  }

  return buckets;
}

function normalizeRows(response, key) {
  return Array.isArray(response?.[key]) ? response[key] : [];
}

function normalizeUsers(response) {
  return Array.isArray(response?.users) ? response.users : [];
}

function deriveCounterpartyName(row, family) {
  if (family === "company_distributor") {
    return row?.distributor?.partyName || row?.payer?.partyName || row?.distributorId || "Distributor";
  }
  return row?.supplier?.partyName || "Supplier";
}

export default function CompanyFinanceWorkspace({ initialSection = "overview" }) {
  const [activeSection, setActiveSection] = useState(() => SECTION_ITEMS.find((item) => item.key === initialSection) || SECTION_ITEMS[0]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [financeReport, setFinanceReport] = useState(null);
  const [companyInvoices, setCompanyInvoices] = useState([]);
  const [companyReceipts, setCompanyReceipts] = useState([]);
  const [companyOpenOrders, setCompanyOpenOrders] = useState([]);
  const [supplierInvoices, setSupplierInvoices] = useState([]);
  const [supplierPayments, setSupplierPayments] = useState([]);
  const [distributors, setDistributors] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [preview, setPreview] = useState({ open: false, title: "", url: "" });

  const [companyInvoiceForm, setCompanyInvoiceForm] = useState({
    distributorId: "",
    companySalesOrderId: "",
    documentNo: nextDoc("CDINV"),
    invoiceDate: new Date().toISOString().slice(0, 10),
    dueDate: "",
    notes: "",
  });

  const [companyReceiptForm, setCompanyReceiptForm] = useState({
    distributorId: "",
    invoiceId: "",
    documentNo: nextDoc("CDRCPT"),
    paymentDate: new Date().toISOString().slice(0, 10),
    amount: "",
    paymentMethod: "bank",
    toAccountId: "",
    referenceNo: "",
    notes: "",
  });

  const [supplierInvoiceForm, setSupplierInvoiceForm] = useState({
    supplierId: "",
    documentNo: nextDoc("SINV"),
    invoiceDate: new Date().toISOString().slice(0, 10),
    dueDate: "",
    amount: "",
    notes: "",
  });

  const [supplierPaymentForm, setSupplierPaymentForm] = useState({
    supplierId: "",
    invoiceId: "",
    documentNo: nextDoc("SPAY"),
    paymentDate: new Date().toISOString().slice(0, 10),
    amount: "",
    paymentMethod: "bank",
    fromAccountId: "",
    referenceNo: "",
    notes: "",
  });

  useEffect(() => {
    const matched = SECTION_ITEMS.find((item) => item.key === initialSection);
    if (matched) setActiveSection(matched);
  }, [initialSection]);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const [financeRes, invoicesRes, receiptsRes, openOrdersRes, supplierInvoicesRes, supplierPaymentsRes, distributorsRes, suppliersRes] = await Promise.all([
        v2Api.finance.overview(),
        v2Api.finance.listCompanyInvoices(),
        v2Api.finance.listCompanyReceipts(),
        v2Api.finance.listCompanyOpenOrders(),
        v2Api.finance.listSupplierInvoices(),
        v2Api.finance.listSupplierPayments(),
        v2Api.finance.listDistributors(),
        v2Api.procurement.suppliers(),
      ]);

      setFinanceReport(financeRes || null);
      setCompanyInvoices(normalizeRows(invoicesRes, "invoices"));
      setCompanyReceipts(normalizeRows(receiptsRes, "receipts"));
      setCompanyOpenOrders(normalizeRows(openOrdersRes, "orders"));
      setSupplierInvoices(normalizeRows(supplierInvoicesRes, "invoices"));
      setSupplierPayments(normalizeRows(supplierPaymentsRes, "payments"));
      setDistributors(normalizeUsers(distributorsRes));
      setSuppliers(normalizeUsers(suppliersRes));
    } catch (err) {
      setError(err.message || "Failed to load finance workspace.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const financeTotals = financeReport?.totals || {};
  const accounts = Array.isArray(financeReport?.accounts) ? financeReport.accounts : [];
  const financeModule = financeReport?.module || {};
  const companyAging = useMemo(() => computeAgingBuckets(companyInvoices), [companyInvoices]);
  const supplierAging = useMemo(() => computeAgingBuckets(supplierInvoices), [supplierInvoices]);

  const distributorOptions = useMemo(
    () => distributors.map((row) => ({
      value: String(row?._id || row?.id || row?.userId || ""),
      label: row?.fullName || row?.username || row?.distributorName || "Distributor",
      raw: row,
    })),
    [distributors],
  );

  const supplierOptions = useMemo(
    () => suppliers.map((row) => ({
      value: String(row?._id || row?.id || row?.userId || ""),
      label: row?.fullName || row?.username || row?.supplierName || "Supplier",
      raw: row,
    })),
    [suppliers],
  );

  const selectedDistributor = distributorOptions.find((row) => row.value === companyInvoiceForm.distributorId)?.raw || null;
  const selectedOpenOrder = companyOpenOrders.find((row) => String(row?._id) === String(companyInvoiceForm.companySalesOrderId)) || null;
  const selectedCompanyInvoice = companyInvoices.find((row) => String(row?._id) === String(companyReceiptForm.invoiceId)) || null;
  const selectedSupplier = supplierOptions.find((row) => row.value === supplierInvoiceForm.supplierId)?.raw || null;
  const selectedSupplierForPayment = supplierOptions.find((row) => row.value === supplierPaymentForm.supplierId)?.raw || null;
  const selectedSupplierInvoice = supplierInvoices.find((row) => String(row?._id) === String(supplierPaymentForm.invoiceId)) || null;

  useEffect(() => {
    if (!selectedOpenOrder) return;
    setCompanyInvoiceForm((current) => ({
      ...current,
      distributorId: current.distributorId || String(selectedOpenOrder?.distributorId || ""),
    }));
  }, [selectedOpenOrder]);

  useEffect(() => {
    if (!selectedCompanyInvoice) return;
    setCompanyReceiptForm((current) => ({
      ...current,
      distributorId: current.distributorId || String(selectedCompanyInvoice?.distributorId || ""),
      amount: current.amount || String(selectedCompanyInvoice?.balanceAmount || selectedCompanyInvoice?.invoiceTotal || ""),
    }));
  }, [selectedCompanyInvoice]);

  useEffect(() => {
    if (!selectedSupplierInvoice) return;
    setSupplierPaymentForm((current) => ({
      ...current,
      supplierId: current.supplierId || String(selectedSupplierInvoice?.supplier?.partyId || ""),
      amount: current.amount || String(selectedSupplierInvoice?.balanceAmount || selectedSupplierInvoice?.invoiceTotal || ""),
    }));
  }, [selectedSupplierInvoice]);

  const summaryCards = [
    { label: "Distributor Outstanding", value: formatCurrency(financeTotals.distributorOutstanding), helper: "Company receivable from distributors" },
    { label: "Supplier Payable", value: formatCurrency(financeTotals.supplierPayable), helper: "Open supplier liability" },
    { label: "Current Receipts", value: formatCurrency(financeTotals.currentReceipts), helper: "Customer + distributor receipts" },
    { label: "Account Balances", value: formatCurrency(accounts.reduce((sum, row) => sum + safeNumber(row?.currentBalance), 0)), helper: `${accounts.length} tracked accounts` },
  ];

  const companyInvoiceColumns = [
    { key: "documentNo", title: "Invoice" },
    { key: "distributor", title: "Distributor", render: (row) => row?.distributor?.partyName || row?.distributorId || "-" },
    { key: "invoiceDate", title: "Date", render: (row) => formatDate(row?.invoiceDate) },
    { key: "invoiceTotal", title: "Total", render: (row) => formatCurrency(row?.invoiceTotal || row?.totals?.grandTotal) },
    { key: "balanceAmount", title: "Balance", render: (row) => formatCurrency(row?.balanceAmount || 0) },
    { key: "paymentStatus", title: "Payment", type: "status" },
    { key: "status", title: "Post Status", type: "status" },
    { key: "actions", title: "Actions", render: (row) => (
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => previewDocument(row, "company_invoice")} className="rounded-xl border px-2.5 py-1 text-xs font-medium hover:bg-zinc-50">Preview</button>
        <button type="button" onClick={() => printDocument(row, "company_invoice")} className="rounded-xl border px-2.5 py-1 text-xs font-medium hover:bg-zinc-50">Print</button>
        {String(row?.status || "").toLowerCase() !== "posted" ? (
          <button type="button" onClick={() => handlePostCompanyInvoice(row?._id)} className="rounded-xl border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100">Post</button>
        ) : null}
      </div>
    ) },
  ];

  const companyReceiptColumns = [
    { key: "documentNo", title: "Receipt" },
    { key: "payer", title: "Distributor", render: (row) => row?.payer?.partyName || row?.distributorId || "-" },
    { key: "paymentDate", title: "Date", render: (row) => formatDate(row?.paymentDate) },
    { key: "amount", title: "Amount", render: (row) => formatCurrency(row?.amount) },
    { key: "paymentMethod", title: "Method" },
    { key: "status", title: "Status", type: "status" },
    { key: "allocations", title: "Allocations", render: (row) => <span className="text-xs text-zinc-600">{row?.allocations?.length || 0} linked</span> },
    { key: "actions", title: "Actions", render: (row) => (
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => previewDocument(row, "company_receipt")} className="rounded-xl border px-2.5 py-1 text-xs font-medium hover:bg-zinc-50">Preview</button>
        <button type="button" onClick={() => printDocument(row, "company_receipt")} className="rounded-xl border px-2.5 py-1 text-xs font-medium hover:bg-zinc-50">Print</button>
        {String(row?.status || "").toLowerCase() !== "posted" ? (
          <button type="button" onClick={() => handlePostCompanyReceipt(row?._id)} className="rounded-xl border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100">Post</button>
        ) : null}
      </div>
    ) },
  ];

  const supplierInvoiceColumns = [
    { key: "documentNo", title: "Supplier Invoice" },
    { key: "supplier", title: "Supplier", render: (row) => row?.supplier?.partyName || "-" },
    { key: "invoiceDate", title: "Date", render: (row) => formatDate(row?.invoiceDate) },
    { key: "invoiceTotal", title: "Total", render: (row) => formatCurrency(row?.invoiceTotal || row?.totals?.grandTotal) },
    { key: "balanceAmount", title: "Balance", render: (row) => formatCurrency(row?.balanceAmount || 0) },
    { key: "paymentStatus", title: "Payment", type: "status" },
    { key: "status", title: "Post Status", type: "status" },
    { key: "actions", title: "Actions", render: (row) => (
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => previewDocument(row, "supplier_invoice")} className="rounded-xl border px-2.5 py-1 text-xs font-medium hover:bg-zinc-50">Preview</button>
        <button type="button" onClick={() => printDocument(row, "supplier_invoice")} className="rounded-xl border px-2.5 py-1 text-xs font-medium hover:bg-zinc-50">Print</button>
        {String(row?.status || "").toLowerCase() !== "posted" ? (
          <button type="button" onClick={() => handlePostSupplierInvoice(row?._id)} className="rounded-xl border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100">Post</button>
        ) : null}
      </div>
    ) },
  ];

  const supplierPaymentColumns = [
    { key: "documentNo", title: "Supplier Payment" },
    { key: "supplier", title: "Supplier", render: (row) => row?.supplier?.partyName || "-" },
    { key: "paymentDate", title: "Date", render: (row) => formatDate(row?.paymentDate) },
    { key: "amount", title: "Amount", render: (row) => formatCurrency(row?.amount) },
    { key: "paymentMethod", title: "Method" },
    { key: "status", title: "Status", type: "status" },
    { key: "allocations", title: "Allocations", render: (row) => <span className="text-xs text-zinc-600">{row?.allocations?.length || 0} linked</span> },
    { key: "actions", title: "Actions", render: (row) => (
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => previewDocument(row, "supplier_payment")} className="rounded-xl border px-2.5 py-1 text-xs font-medium hover:bg-zinc-50">Preview</button>
        <button type="button" onClick={() => printDocument(row, "supplier_payment")} className="rounded-xl border px-2.5 py-1 text-xs font-medium hover:bg-zinc-50">Print</button>
        {String(row?.status || "").toLowerCase() !== "posted" ? (
          <button type="button" onClick={() => handlePostSupplierPayment(row?._id)} className="rounded-xl border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100">Post</button>
        ) : null}
      </div>
    ) },
  ];

  function previewDocument(row, type) {
    const documentRows = buildDocumentRows(row, type);
    setPreview({
      open: true,
      title: documentTitle(type, row),
      url: buildDocumentUrl(documentTitle(type, row), documentRows, buildDocumentMeta(row, type)),
    });
  }

  function printDocument(row, type) {
    const url = buildDocumentUrl(documentTitle(type, row), buildDocumentRows(row, type), buildDocumentMeta(row, type));
    const win = window.open(url, "_blank", "noopener,noreferrer");
    if (win) {
      win.focus();
      setTimeout(() => win.print(), 300);
    }
  }

  function buildDocumentMeta(row, type) {
    return {
      Type: documentTitle(type, row),
      Counterparty: deriveCounterpartyName(row, type.includes("supplier") ? "supplier" : "company_distributor"),
      Date: formatDate(row?.invoiceDate || row?.paymentDate || row?.createdAt),
      Status: row?.status || "draft",
    };
  }

  function buildDocumentRows(row, type) {
    const allocations = (row?.allocations || []).map((item, index) => ({
      label: `Allocation ${index + 1}`,
      value: `${item?.invoiceNo || item?.invoiceId || "Invoice"} — ${formatCurrency(item?.allocatedAmount)}`,
    }));

    const base = [
      { label: "Document No", value: row?.documentNo || "-" },
      { label: "Counterparty", value: deriveCounterpartyName(row, type.includes("supplier") ? "supplier" : "company_distributor") },
      { label: type.includes("receipt") || type.includes("payment") ? "Amount" : "Invoice Total", value: formatCurrency(row?.amount || row?.invoiceTotal || row?.totals?.grandTotal) },
      { label: "Balance", value: formatCurrency(row?.balanceAmount || 0) },
      { label: "Payment Method", value: row?.paymentMethod || "-" },
      { label: "Financial Status", value: row?.paymentStatus || row?.status || "-" },
    ];

    return [...base, ...allocations];
  }

  function documentTitle(type, row) {
    const titleMap = {
      company_invoice: "Company Invoice to Distributor",
      company_receipt: "Receipt from Distributor",
      supplier_invoice: "Supplier Invoice",
      supplier_payment: "Supplier Payment",
    };
    return `${titleMap[type] || "Document"} — ${row?.documentNo || "Preview"}`;
  }

  async function handleCreateCompanyInvoice(event) {
    event.preventDefault();
    if (!selectedOpenOrder || !selectedDistributor) {
      setError("Select a distributor and an open company order first.");
      return;
    }
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      const payload = {
        family: "company_distributor",
        documentNo: companyInvoiceForm.documentNo,
        distributorId: companyInvoiceForm.distributorId,
        distributor: {
          partyType: "distributor",
          partyId: companyInvoiceForm.distributorId,
          partyName: selectedDistributor?.fullName || selectedDistributor?.username || "Distributor",
        },
        companySalesOrderId: selectedOpenOrder?._id,
        invoiceDate: companyInvoiceForm.invoiceDate,
        dueDate: companyInvoiceForm.dueDate,
        lines: (selectedOpenOrder?.lines || []).map((line, index) => ({
          lineNo: line?.lineNo || index + 1,
          productId: line?.productId,
          productCode: line?.productCode,
          productName: line?.productName,
          qty: safeNumber(line?.qty),
          unitPrice: safeNumber(line?.unitPrice || line?.unitCost),
          unitCost: safeNumber(line?.unitCost),
          netLineAmount: safeNumber(line?.netLineAmount || safeNumber(line?.qty) * safeNumber(line?.unitPrice || line?.unitCost)),
        })),
        totals: selectedOpenOrder?.totals || {
          grandTotal: safeNumber(selectedOpenOrder?.totals?.grandTotal || 0),
        },
        invoiceTotal: safeNumber(selectedOpenOrder?.totals?.grandTotal || 0),
        notes: companyInvoiceForm.notes,
      };
      await v2Api.finance.createCompanyInvoice(payload);
      setMessage("Distributor invoice created successfully.");
      setCompanyInvoiceForm({ distributorId: "", companySalesOrderId: "", documentNo: nextDoc("CDINV"), invoiceDate: new Date().toISOString().slice(0, 10), dueDate: "", notes: "" });
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to create distributor invoice.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateCompanyReceipt(event) {
    event.preventDefault();
    if (!selectedCompanyInvoice) {
      setError("Select a distributor invoice first.");
      return;
    }
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      const payload = {
        family: "company_distributor",
        documentNo: companyReceiptForm.documentNo,
        distributorId: companyReceiptForm.distributorId || selectedCompanyInvoice?.distributorId,
        payer: {
          partyType: "distributor",
          partyId: companyReceiptForm.distributorId || selectedCompanyInvoice?.distributorId,
          partyName: selectedCompanyInvoice?.distributor?.partyName || "Distributor",
        },
        paymentDate: companyReceiptForm.paymentDate,
        amount: safeNumber(companyReceiptForm.amount),
        paymentMethod: companyReceiptForm.paymentMethod,
        toAccountId: companyReceiptForm.toAccountId,
        referenceNo: companyReceiptForm.referenceNo,
        allocations: [{
          invoiceId: selectedCompanyInvoice?._id,
          invoiceNo: selectedCompanyInvoice?.documentNo,
          allocatedAmount: safeNumber(companyReceiptForm.amount),
        }],
        notes: companyReceiptForm.notes,
      };
      await v2Api.finance.createCompanyReceipt(payload);
      setMessage("Distributor receipt created successfully.");
      setCompanyReceiptForm({ distributorId: "", invoiceId: "", documentNo: nextDoc("CDRCPT"), paymentDate: new Date().toISOString().slice(0, 10), amount: "", paymentMethod: "bank", toAccountId: "", referenceNo: "", notes: "" });
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to create distributor receipt.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateSupplierInvoice(event) {
    event.preventDefault();
    if (!selectedSupplier) {
      setError("Select a supplier first.");
      return;
    }
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      const amount = safeNumber(supplierInvoiceForm.amount);
      await v2Api.finance.createSupplierInvoice({
        documentNo: supplierInvoiceForm.documentNo,
        supplier: {
          partyType: "supplier",
          partyId: supplierInvoiceForm.supplierId,
          partyName: selectedSupplier?.fullName || selectedSupplier?.username || "Supplier",
        },
        invoiceDate: supplierInvoiceForm.invoiceDate,
        dueDate: supplierInvoiceForm.dueDate,
        lines: [
          {
            lineNo: 1,
            productName: "Supplier bill",
            qty: 1,
            unitCost: amount,
            netLineAmount: amount,
          },
        ],
        totals: { grandTotal: amount, subtotal: amount },
        invoiceTotal: amount,
        notes: supplierInvoiceForm.notes,
      });
      setMessage("Supplier invoice created successfully.");
      setSupplierInvoiceForm({ supplierId: "", documentNo: nextDoc("SINV"), invoiceDate: new Date().toISOString().slice(0, 10), dueDate: "", amount: "", notes: "" });
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to create supplier invoice.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateSupplierPayment(event) {
    event.preventDefault();
    if (!selectedSupplierInvoice || !selectedSupplierForPayment) {
      setError("Select a supplier and supplier invoice first.");
      return;
    }
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      const amount = safeNumber(supplierPaymentForm.amount);
      await v2Api.finance.createSupplierPayment({
        documentNo: supplierPaymentForm.documentNo,
        supplier: {
          partyType: "supplier",
          partyId: supplierPaymentForm.supplierId,
          partyName: selectedSupplierForPayment?.fullName || selectedSupplierForPayment?.username || "Supplier",
        },
        paymentDate: supplierPaymentForm.paymentDate,
        amount,
        paymentMethod: supplierPaymentForm.paymentMethod,
        fromAccountId: supplierPaymentForm.fromAccountId,
        referenceNo: supplierPaymentForm.referenceNo,
        allocations: [{
          invoiceId: selectedSupplierInvoice?._id,
          invoiceNo: selectedSupplierInvoice?.documentNo,
          allocatedAmount: amount,
        }],
        notes: supplierPaymentForm.notes,
      });
      setMessage("Supplier payment created successfully.");
      setSupplierPaymentForm({ supplierId: "", invoiceId: "", documentNo: nextDoc("SPAY"), paymentDate: new Date().toISOString().slice(0, 10), amount: "", paymentMethod: "bank", fromAccountId: "", referenceNo: "", notes: "" });
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to create supplier payment.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePostCompanyInvoice(id) {
    try {
      setError("");
      setMessage("");
      await v2Api.finance.postCompanyInvoice(id);
      setMessage("Distributor invoice posted successfully.");
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to post distributor invoice.");
    }
  }

  async function handlePostCompanyReceipt(id) {
    try {
      setError("");
      setMessage("");
      await v2Api.finance.postCompanyReceipt(id);
      setMessage("Distributor receipt posted successfully.");
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to post distributor receipt.");
    }
  }

  async function handlePostSupplierInvoice(id) {
    try {
      setError("");
      setMessage("");
      await v2Api.finance.postSupplierInvoice(id);
      setMessage("Supplier invoice posted successfully.");
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to post supplier invoice.");
    }
  }

  async function handlePostSupplierPayment(id) {
    try {
      setError("");
      setMessage("");
      await v2Api.finance.postSupplierPayment(id);
      setMessage("Supplier payment posted successfully.");
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to post supplier payment.");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Finance & Accounts"
        title="Company Finance Command Center"
        description="Manage distributor invoicing, receipts, supplier settlements, aging, and account balances from one V2-first finance workspace."
        actions={
          <button type="button" onClick={loadData} className="rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
            Refresh finance data
          </button>
        }
      />

      {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
      {message ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}

      <ModuleCardStrip items={SECTION_ITEMS} activeKey={activeSection.key} onSelect={setActiveSection} />

      {loading ? (
        <SectionCard title="Loading finance workspace" description="Fetching V2 invoices, receipts, balances, and settlement data.">
          <div className="grid gap-3 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-24 animate-pulse rounded-2xl border border-zinc-200 bg-zinc-100" />
            ))}
          </div>
        </SectionCard>
      ) : null}

      {!loading && activeSection.key === "overview" ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => (
              <SectionCard key={card.label} className="!p-4" title={card.label} description={card.helper}>
                <div className="text-2xl font-semibold text-zinc-950">{card.value}</div>
              </SectionCard>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
            <SectionCard title="Finance highlights" description="The finance report below is sourced from the V2 reporting layer.">
              {financeModule?.kpis?.length ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {financeModule.kpis.map((kpi) => (
                    <div key={kpi.label} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                      <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">{kpi.label}</div>
                      <div className="mt-2 text-lg font-semibold text-zinc-950">{kpi.value}</div>
                      <div className="mt-1 text-xs text-zinc-500">{kpi.note}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="No finance KPI data" description="Finance metrics will appear when invoices, receipts, and accounts are populated." />
              )}
            </SectionCard>

            <SectionCard title="Alerts & insights" description="Watch these before moving to UI testing and reconciliation.">
              <div className="space-y-3">
                {(financeModule?.alerts || []).slice(0, 3).map((item) => (
                  <div key={item} className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{item}</div>
                ))}
                {(financeModule?.insights || []).slice(0, 3).map((item) => (
                  <div key={item} className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{item}</div>
                ))}
              </div>
            </SectionCard>
          </div>

          <SectionCard title="Tracked account balances" description="Account master balances from the V2 finance report.">
            <DocumentTable
              columns={[
                { key: "accountName", title: "Account" },
                { key: "accountType", title: "Type", render: (row) => row?.accountType || "-" },
                { key: "currentBalance", title: "Current Balance", render: (row) => formatCurrency(row?.currentBalance) },
                { key: "status", title: "Health", render: (row) => <StatusBadge value={safeNumber(row?.currentBalance) >= 0 ? "balanced" : "negative"} tone={safeNumber(row?.currentBalance) >= 0 ? "approved" : "unpaid"} /> },
              ]}
              rows={accounts}
              emptyTitle="No tracked accounts"
              emptyDescription="Create and reconcile bank or cash accounts to surface balances here."
            />
          </SectionCard>
        </div>
      ) : null}

      {!loading && activeSection.key === "invoices" ? (
        <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <SectionCard title="Create company invoice to distributor" description="Build invoice headers from open company supply orders. Post later when the document is reviewed.">
            <form className="space-y-4" onSubmit={handleCreateCompanyInvoice}>
              <Field label="Distributor">
                <select value={companyInvoiceForm.distributorId} onChange={(event) => setCompanyInvoiceForm((current) => ({ ...current, distributorId: event.target.value, companySalesOrderId: "" }))} className="field">
                  <option value="">Select distributor</option>
                  {distributorOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </Field>
              <Field label="Open company order">
                <select value={companyInvoiceForm.companySalesOrderId} onChange={(event) => setCompanyInvoiceForm((current) => ({ ...current, companySalesOrderId: event.target.value }))} className="field">
                  <option value="">Select company order</option>
                  {companyOpenOrders.filter((order) => !companyInvoiceForm.distributorId || String(order?.distributorId || "") === String(companyInvoiceForm.distributorId)).map((order) => (
                    <option key={order._id} value={order._id}>{order.documentNo || order._id} — {formatCurrency(order?.totals?.grandTotal)}</option>
                  ))}
                </select>
              </Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Invoice no"><input className="field" value={companyInvoiceForm.documentNo} onChange={(event) => setCompanyInvoiceForm((current) => ({ ...current, documentNo: event.target.value }))} /></Field>
                <Field label="Invoice date"><input type="date" className="field" value={companyInvoiceForm.invoiceDate} onChange={(event) => setCompanyInvoiceForm((current) => ({ ...current, invoiceDate: event.target.value }))} /></Field>
              </div>
              <Field label="Due date"><input type="date" className="field" value={companyInvoiceForm.dueDate} onChange={(event) => setCompanyInvoiceForm((current) => ({ ...current, dueDate: event.target.value }))} /></Field>
              <Field label="Notes"><textarea rows={3} className="field" value={companyInvoiceForm.notes} onChange={(event) => setCompanyInvoiceForm((current) => ({ ...current, notes: event.target.value }))} /></Field>
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
                {selectedOpenOrder ? `Invoice total will use company order total ${formatCurrency(selectedOpenOrder?.totals?.grandTotal)}.` : "Select a distributor order to auto-build invoice totals and lines."}
              </div>
              <button disabled={submitting} className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60">Create company invoice</button>
            </form>
          </SectionCard>

          <SectionCard title="Company invoices to distributors" description="Preview, print, post, and monitor payment status for issued invoices.">
            <DocumentTable columns={companyInvoiceColumns} rows={companyInvoices} emptyTitle="No company invoices" emptyDescription="Create company invoices from approved company supply orders to start the finance bridge." />
          </SectionCard>
        </div>
      ) : null}

      {!loading && activeSection.key === "receipts" ? (
        <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <SectionCard title="Create receipt from distributor" description="Allocate incoming distributor receipts against the open invoices shown below.">
            <form className="space-y-4" onSubmit={handleCreateCompanyReceipt}>
              <Field label="Open invoice">
                <select value={companyReceiptForm.invoiceId} onChange={(event) => setCompanyReceiptForm((current) => ({ ...current, invoiceId: event.target.value }))} className="field">
                  <option value="">Select open company invoice</option>
                  {companyInvoices.filter((invoice) => ["unpaid", "partial", "overpaid"].includes(String(invoice?.paymentStatus || "").toLowerCase())).map((invoice) => (
                    <option key={invoice._id} value={invoice._id}>{invoice.documentNo} — {invoice?.distributor?.partyName || invoice?.distributorId || "Distributor"} — {formatCurrency(invoice?.balanceAmount || invoice?.invoiceTotal)}</option>
                  ))}
                </select>
              </Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Receipt no"><input className="field" value={companyReceiptForm.documentNo} onChange={(event) => setCompanyReceiptForm((current) => ({ ...current, documentNo: event.target.value }))} /></Field>
                <Field label="Payment date"><input type="date" className="field" value={companyReceiptForm.paymentDate} onChange={(event) => setCompanyReceiptForm((current) => ({ ...current, paymentDate: event.target.value }))} /></Field>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Amount"><input className="field" value={companyReceiptForm.amount} onChange={(event) => setCompanyReceiptForm((current) => ({ ...current, amount: event.target.value }))} /></Field>
                <Field label="Payment method">
                  <select className="field" value={companyReceiptForm.paymentMethod} onChange={(event) => setCompanyReceiptForm((current) => ({ ...current, paymentMethod: event.target.value }))}>
                    <option value="bank">Bank</option>
                    <option value="cash">Cash</option>
                    <option value="cheque">Cheque</option>
                    <option value="online">Online</option>
                  </select>
                </Field>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="To account id"><input className="field" value={companyReceiptForm.toAccountId} onChange={(event) => setCompanyReceiptForm((current) => ({ ...current, toAccountId: event.target.value }))} /></Field>
                <Field label="Reference no"><input className="field" value={companyReceiptForm.referenceNo} onChange={(event) => setCompanyReceiptForm((current) => ({ ...current, referenceNo: event.target.value }))} /></Field>
              </div>
              <Field label="Notes"><textarea rows={3} className="field" value={companyReceiptForm.notes} onChange={(event) => setCompanyReceiptForm((current) => ({ ...current, notes: event.target.value }))} /></Field>
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
                {selectedCompanyInvoice ? `This receipt will allocate to ${selectedCompanyInvoice.documentNo} with current balance ${formatCurrency(selectedCompanyInvoice?.balanceAmount || selectedCompanyInvoice?.invoiceTotal)}.` : "Choose an invoice to auto-fill the suggested receipt amount."}
              </div>
              <button disabled={submitting} className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60">Create distributor receipt</button>
            </form>
          </SectionCard>

          <SectionCard title="Distributor receipts" description="Track receipt allocations, post status, and preview printable settlement documents.">
            <DocumentTable columns={companyReceiptColumns} rows={companyReceipts} emptyTitle="No company receipts" emptyDescription="Create distributor receipts against posted company invoices to keep aging accurate." />
          </SectionCard>
        </div>
      ) : null}

      {!loading && activeSection.key === "payments" ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <SectionCard title="Supplier invoices" description="Capture supplier bills before posting them into payable status.">
            <form className="grid gap-4 md:grid-cols-2" onSubmit={handleCreateSupplierInvoice}>
              <Field label="Supplier" className="md:col-span-2">
                <select value={supplierInvoiceForm.supplierId} onChange={(event) => setSupplierInvoiceForm((current) => ({ ...current, supplierId: event.target.value }))} className="field">
                  <option value="">Select supplier</option>
                  {supplierOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </Field>
              <Field label="Invoice no"><input className="field" value={supplierInvoiceForm.documentNo} onChange={(event) => setSupplierInvoiceForm((current) => ({ ...current, documentNo: event.target.value }))} /></Field>
              <Field label="Amount"><input className="field" value={supplierInvoiceForm.amount} onChange={(event) => setSupplierInvoiceForm((current) => ({ ...current, amount: event.target.value }))} /></Field>
              <Field label="Invoice date"><input type="date" className="field" value={supplierInvoiceForm.invoiceDate} onChange={(event) => setSupplierInvoiceForm((current) => ({ ...current, invoiceDate: event.target.value }))} /></Field>
              <Field label="Due date"><input type="date" className="field" value={supplierInvoiceForm.dueDate} onChange={(event) => setSupplierInvoiceForm((current) => ({ ...current, dueDate: event.target.value }))} /></Field>
              <Field label="Notes" className="md:col-span-2"><textarea rows={3} className="field" value={supplierInvoiceForm.notes} onChange={(event) => setSupplierInvoiceForm((current) => ({ ...current, notes: event.target.value }))} /></Field>
              <div className="md:col-span-2 flex justify-end"><button disabled={submitting} className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60">Create supplier invoice</button></div>
            </form>
            <div className="mt-6">
              <DocumentTable columns={supplierInvoiceColumns} rows={supplierInvoices} emptyTitle="No supplier invoices" emptyDescription="Create supplier invoices to build the payable pipeline." />
            </div>
          </SectionCard>

          <SectionCard title="Supplier payments" description="Allocate outgoing payments against supplier invoices and keep open liability clean.">
            <form className="grid gap-4 md:grid-cols-2" onSubmit={handleCreateSupplierPayment}>
              <Field label="Supplier" className="md:col-span-2">
                <select value={supplierPaymentForm.supplierId} onChange={(event) => setSupplierPaymentForm((current) => ({ ...current, supplierId: event.target.value, invoiceId: "" }))} className="field">
                  <option value="">Select supplier</option>
                  {supplierOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </Field>
              <Field label="Supplier invoice" className="md:col-span-2">
                <select value={supplierPaymentForm.invoiceId} onChange={(event) => setSupplierPaymentForm((current) => ({ ...current, invoiceId: event.target.value }))} className="field">
                  <option value="">Select open supplier invoice</option>
                  {supplierInvoices.filter((invoice) => (!supplierPaymentForm.supplierId || String(invoice?.supplier?.partyId || "") === String(supplierPaymentForm.supplierId)) && ["unpaid", "partial", "overpaid"].includes(String(invoice?.paymentStatus || "").toLowerCase())).map((invoice) => (
                    <option key={invoice._id} value={invoice._id}>{invoice.documentNo} — {invoice?.supplier?.partyName || "Supplier"} — {formatCurrency(invoice?.balanceAmount || invoice?.invoiceTotal)}</option>
                  ))}
                </select>
              </Field>
              <Field label="Payment no"><input className="field" value={supplierPaymentForm.documentNo} onChange={(event) => setSupplierPaymentForm((current) => ({ ...current, documentNo: event.target.value }))} /></Field>
              <Field label="Amount"><input className="field" value={supplierPaymentForm.amount} onChange={(event) => setSupplierPaymentForm((current) => ({ ...current, amount: event.target.value }))} /></Field>
              <Field label="Payment date"><input type="date" className="field" value={supplierPaymentForm.paymentDate} onChange={(event) => setSupplierPaymentForm((current) => ({ ...current, paymentDate: event.target.value }))} /></Field>
              <Field label="Method">
                <select className="field" value={supplierPaymentForm.paymentMethod} onChange={(event) => setSupplierPaymentForm((current) => ({ ...current, paymentMethod: event.target.value }))}>
                  <option value="bank">Bank</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                  <option value="online">Online</option>
                </select>
              </Field>
              <Field label="From account id"><input className="field" value={supplierPaymentForm.fromAccountId} onChange={(event) => setSupplierPaymentForm((current) => ({ ...current, fromAccountId: event.target.value }))} /></Field>
              <Field label="Reference no"><input className="field" value={supplierPaymentForm.referenceNo} onChange={(event) => setSupplierPaymentForm((current) => ({ ...current, referenceNo: event.target.value }))} /></Field>
              <Field label="Notes" className="md:col-span-2"><textarea rows={3} className="field" value={supplierPaymentForm.notes} onChange={(event) => setSupplierPaymentForm((current) => ({ ...current, notes: event.target.value }))} /></Field>
              <div className="md:col-span-2 flex justify-end"><button disabled={submitting} className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60">Create supplier payment</button></div>
            </form>
            <div className="mt-6">
              <DocumentTable columns={supplierPaymentColumns} rows={supplierPayments} emptyTitle="No supplier payments" emptyDescription="Create supplier payments to reduce open supplier liability." />
            </div>
          </SectionCard>
        </div>
      ) : null}

      {!loading && activeSection.key === "aging" ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {[
              { label: "Current", value: companyAging.current },
              { label: "1-30 days", value: companyAging.d1_30 },
              { label: "31-60 days", value: companyAging.d31_60 },
              { label: "61-90 days", value: companyAging.d61_90 },
              { label: "90+ days", value: companyAging.d90_plus },
            ].map((bucket) => (
              <SectionCard key={bucket.label} className="!p-4" title={bucket.label}>
                <div className="text-xl font-semibold text-zinc-950">{formatCurrency(bucket.value)}</div>
                <div className="mt-1 text-xs text-zinc-500">Distributor receivable aging bucket</div>
              </SectionCard>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <SectionCard title="Distributor receivable aging" description="Aging buckets based on due date and current balance.">
              <DocumentTable
                columns={[
                  { key: "documentNo", title: "Invoice" },
                  { key: "distributor", title: "Distributor", render: (row) => row?.distributor?.partyName || row?.distributorId || "-" },
                  { key: "dueDate", title: "Due Date", render: (row) => formatDate(row?.dueDate) },
                  { key: "balanceAmount", title: "Balance", render: (row) => formatCurrency(row?.balanceAmount || row?.invoiceTotal) },
                  { key: "paymentStatus", title: "Status", type: "status" },
                ]}
                rows={companyInvoices.filter((row) => safeNumber(row?.balanceAmount || row?.invoiceTotal) > 0)}
                emptyTitle="No open distributor invoices"
                emptyDescription="Posted company invoices with open balances will appear here."
              />
            </SectionCard>

            <SectionCard title="Supplier payable aging" description="Track which supplier bills remain open.">
              <DocumentTable
                columns={[
                  { key: "documentNo", title: "Supplier Invoice" },
                  { key: "supplier", title: "Supplier", render: (row) => row?.supplier?.partyName || "-" },
                  { key: "dueDate", title: "Due Date", render: (row) => formatDate(row?.dueDate) },
                  { key: "balanceAmount", title: "Balance", render: (row) => formatCurrency(row?.balanceAmount || row?.invoiceTotal) },
                  { key: "paymentStatus", title: "Status", type: "status" },
                ]}
                rows={supplierInvoices.filter((row) => safeNumber(row?.balanceAmount || row?.invoiceTotal) > 0)}
                emptyTitle="No open supplier invoices"
                emptyDescription="Posted supplier bills with remaining balance will appear here."
              />
            </SectionCard>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <SectionCard title="Aging summary" description="Receivable and payable buckets side by side.">
              <div className="grid gap-3 md:grid-cols-2">
                <SummaryBlock title="Distributor receivables" items={[companyAging.current, companyAging.d1_30, companyAging.d31_60, companyAging.d61_90, companyAging.d90_plus]} />
                <SummaryBlock title="Supplier payables" items={[supplierAging.current, supplierAging.d1_30, supplierAging.d31_60, supplierAging.d61_90, supplierAging.d90_plus]} />
              </div>
            </SectionCard>
            <SectionCard title="Account balances" description="Use these balances while posting receipts and supplier payments.">
              <DocumentTable
                columns={[
                  { key: "accountName", title: "Account" },
                  { key: "accountType", title: "Type", render: (row) => row?.accountType || "-" },
                  { key: "currentBalance", title: "Current Balance", render: (row) => formatCurrency(row?.currentBalance) },
                ]}
                rows={accounts}
                emptyTitle="No account balances"
                emptyDescription="Tracked company accounts will appear here after account setup and postings."
              />
            </SectionCard>
          </div>
        </div>
      ) : null}

      <DocumentViewerModal open={preview.open} title={preview.title} documentUrl={preview.url} onClose={() => setPreview({ open: false, title: "", url: "" })} />

      <style jsx>{`
        .field {
          width: 100%;
          border-radius: 1rem;
          border: 1px solid rgb(228 228 231);
          background: white;
          padding: 0.7rem 0.9rem;
          font-size: 0.925rem;
          color: rgb(24 24 27);
        }
        .field:focus {
          outline: none;
          border-color: rgb(16 185 129);
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.12);
        }
      `}</style>
    </div>
  );
}

function Field({ label, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <div className="mb-1.5 text-sm font-medium text-zinc-700">{label}</div>
      {children}
    </label>
  );
}

function SummaryBlock({ title, items }) {
  const labels = ["Current", "1-30", "31-60", "61-90", "90+"];
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <div className="text-sm font-semibold text-zinc-900">{title}</div>
      <div className="mt-3 space-y-2">
        {labels.map((label, index) => (
          <div key={label} className="flex items-center justify-between text-sm">
            <span className="text-zinc-600">{label}</span>
            <span className="font-medium text-zinc-900">{formatCurrency(items[index])}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
