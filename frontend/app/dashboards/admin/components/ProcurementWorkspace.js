"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { v2Api } from "../../../lib/api";
import DocumentTable from "../../../components/foundation/DocumentTable";
import EmptyState from "../../../components/foundation/EmptyState";
import ModuleCardStrip from "../../../components/foundation/ModuleCardStrip";
import PageHeader from "../../../components/foundation/PageHeader";
import SectionCard from "../../../components/foundation/SectionCard";

const MODULE_ITEMS = [
  { key: "overview", title: "Overview", description: "Procurement health, supplier readiness, GRN pipeline, and payment exposure." },
  { key: "suppliers", title: "Supplier Master", description: "Supplier list, warehouse linkage, and quick profile access." },
  { key: "purchaseOrders", title: "Purchase Documents", description: "Procurement entries moving toward receipt and supplier invoice status." },
  { key: "grn", title: "Goods Receipt Waiting", description: "Purchase receipts waiting for posting, verification, or warehouse follow-up." },
  { key: "payments", title: "Invoice & Payment Status", description: "Supplier invoice aging and payment settlement visibility." },
];

function money(value) {
  return `PKR ${Number(value || 0).toLocaleString()}`;
}

function fmt(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
}

function normalizeSupplierRows(response) {
  return Array.isArray(response?.users) ? response.users : [];
}

function normalizePaymentRows(response, key) {
  return Array.isArray(response?.[key]) ? response[key] : [];
}

export default function ProcurementWorkspace({ initialModuleKey = "overview" }) {
  const [activeModule, setActiveModule] = useState(() => MODULE_ITEMS.find((item) => item.key === initialModuleKey) || MODULE_ITEMS[0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [suppliers, setSuppliers] = useState([]);
  const [supplierInvoices, setSupplierInvoices] = useState([]);
  const [supplierPayments, setSupplierPayments] = useState([]);
  const [ledgerRows, setLedgerRows] = useState([]);
  const [report, setReport] = useState(null);

  useEffect(() => {
    const matched = MODULE_ITEMS.find((item) => item.key === initialModuleKey);
    if (matched) setActiveModule(matched);
  }, [initialModuleKey]);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [supplierData, invoiceData, paymentData, ledgerData, reportData] = await Promise.all([
          v2Api.procurement.suppliers(),
          v2Api.procurement.supplierInvoices(),
          v2Api.procurement.supplierPayments(),
          v2Api.procurement.goodsReceipts({ ownerType: "company" }),
          v2Api.procurement.overview(),
        ]);
        if (!active) return;
        setSuppliers(normalizeSupplierRows(supplierData));
        setSupplierInvoices(normalizePaymentRows(invoiceData, "invoices"));
        setSupplierPayments(normalizePaymentRows(paymentData, "payments"));
        setLedgerRows(Array.isArray(ledgerData?.rows) ? ledgerData.rows : []);
        setReport(reportData || null);
      } catch (err) {
        if (!active) return;
        setError(err.message || "Failed to load procurement workspace");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const purchaseReceiptRows = useMemo(
    () => ledgerRows.filter((row) => String(row?.movementType || "").toLowerCase() === "purchase_receipt"),
    [ledgerRows],
  );

  const overviewCards = useMemo(() => {
    const unpaidInvoices = supplierInvoices.filter((row) => String(row?.paymentStatus || "").toLowerCase() === "unpaid").length;
    const partialInvoices = supplierInvoices.filter((row) => String(row?.paymentStatus || "").toLowerCase() === "partial").length;
    const activeSuppliers = suppliers.filter((row) => String(row?.status || "").toLowerCase() === "active").length;
    const linkedWarehouses = suppliers.filter((row) => row?.supplierWarehouseName1 || row?.supplierWarehouseName2).length;
    const receiptsWaiting = purchaseReceiptRows.length;
    const approvedPayments = supplierPayments
      .filter((row) => ["approved", "posted"].includes(String(row?.status || "").toLowerCase()))
      .reduce((sum, row) => sum + Number(row?.amount || 0), 0);

    return [
      { label: "Suppliers", value: suppliers.length, helper: `${activeSuppliers} active suppliers` },
      { label: "Linked Warehouses", value: linkedWarehouses, helper: "Supplier-to-warehouse readiness" },
      { label: "Receipts Captured", value: purchaseReceiptRows.length, helper: `${receiptsWaiting} V2 purchase receipt entries` },
      { label: "Supplier Invoices", value: supplierInvoices.length, helper: `${unpaidInvoices} unpaid · ${partialInvoices} partial` },
      { label: "Supplier Payments", value: supplierPayments.length, helper: `Approved ${money(approvedPayments)}` },
      { label: "Inbound Quantity", value: Number(report?.kpis?.totalQuantity || 0).toLocaleString(), helper: "Goods receipts quantity" },
    ];
  }, [purchaseReceiptRows, report?.kpis?.totalQuantity, supplierInvoices, supplierPayments, suppliers]);

  const receiptQueue = useMemo(
    () => purchaseReceiptRows
      .slice()
      .sort((a, b) => new Date(b?.postedAt || b?.createdAt || 0) - new Date(a?.postedAt || a?.createdAt || 0))
      .slice(0, 8),
    [purchaseReceiptRows],
  );

  const dueInvoices = useMemo(
    () => supplierInvoices
      .slice()
      .sort((a, b) => new Date(a?.dueDate || a?.invoiceDate || 0) - new Date(b?.dueDate || b?.invoiceDate || 0))
      .slice(0, 8),
    [supplierInvoices],
  );

  const content = useMemo(() => {
    if (loading) {
      return <EmptyState title="Loading procurement workspace" description="Fetching supplier, invoice, GRN, and payment signals from the V2 backend." />;
    }

    if (error) {
      return <EmptyState title="Procurement workspace failed to load" description={error} />;
    }

    if (activeModule.key === "overview") {
      return (
        <div className="space-y-5">
          <SectionCard title="Procurement health overview" description="Use these live V2 indicators to monitor supplier readiness, receipt intake, and payable risk.">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {overviewCards.map((card) => (
                <div key={card.label} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-zinc-500">{card.label}</div>
                  <div className="mt-2 text-2xl font-semibold text-zinc-950">{card.value}</div>
                  <div className="mt-2 text-sm text-zinc-600">{card.helper}</div>
                </div>
              ))}
            </div>
          </SectionCard>

          <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
            <SectionCard title="Latest goods receipt queue" description="Receipts recently captured in the inventory ledger. Use these to confirm inbound procurement activity.">
              <DocumentTable
                rows={receiptQueue}
                columns={[
                  { key: "referenceNo", title: "Reference" },
                  { key: "productName", title: "Product" },
                  { key: "warehouseName", title: "Warehouse" },
                  { key: "qty", title: "Qty", render: (row) => Number(row?.qty || 0).toLocaleString() },
                  { key: "postedAt", title: "Posted", render: (row) => fmt(row?.postedAt || row?.createdAt) },
                ]}
                emptyTitle="No purchase receipts yet"
                emptyDescription="Goods receipt entries will appear here once purchase receipts are posted to the V2 ledger."
              />
            </SectionCard>

            <SectionCard title="Supplier payment watchlist" description="Invoices with due dates or partial/unpaid status needing finance follow-up.">
              <DocumentTable
                rows={dueInvoices}
                columns={[
                  { key: "documentNo", title: "Invoice" },
                  { key: "supplier", title: "Supplier", render: (row) => row?.supplier?.partyName || "-" },
                  { key: "invoiceTotal", title: "Amount", render: (row) => money(row?.invoiceTotal) },
                  { key: "paymentStatus", title: "Status", type: "status" },
                  { key: "dueDate", title: "Due", render: (row) => fmt(row?.dueDate || row?.invoiceDate) },
                ]}
                emptyTitle="No supplier invoices found"
                emptyDescription="Supplier invoices posted through V2 payments will appear here."
              />
            </SectionCard>
          </div>
        </div>
      );
    }

    if (activeModule.key === "suppliers") {
      return (
        <SectionCard title="Supplier master" description="Suppliers synced from user management with direct access to detailed supplier procurement profiles.">
          <DocumentTable
            rows={suppliers}
            columns={[
              {
                key: "fullName",
                title: "Supplier",
                render: (row) => (
                  <div className="space-y-1">
                    <Link className="font-semibold text-emerald-700 hover:underline" href={`/dashboards/admin/procurement/suppliers/${row?._id}`}>
                      {row?.fullName || row?.username || "Unnamed supplier"}
                    </Link>
                    <div className="text-xs text-zinc-500">{row?.email || "No email saved"}</div>
                  </div>
                ),
              },
              { key: "status", title: "Status", type: "status" },
              { key: "supplierWarehouseName1", title: "Primary warehouse", render: (row) => row?.supplierWarehouseName1 || "-" },
              { key: "supplierWarehouseName2", title: "Backup warehouse", render: (row) => row?.supplierWarehouseName2 || "-" },
              { key: "mobile", title: "Phone", render: (row) => row?.mobile || row?.mobileNumber || "-" },
            ]}
            emptyTitle="No suppliers found"
            emptyDescription="Create supplier users in user management to activate the procurement flow."
          />
        </SectionCard>
      );
    }

    if (activeModule.key === "purchaseOrders") {
      return (
        <SectionCard title="Procurement documents" description="This V2 view uses supplier invoices and purchase receipt postings as the current procurement document trail.">
          <DocumentTable
            rows={supplierInvoices}
            columns={[
              { key: "documentNo", title: "Invoice / PO ref" },
              { key: "supplier", title: "Supplier", render: (row) => row?.supplier?.partyName || "-" },
              { key: "invoiceDate", title: "Invoice date", render: (row) => fmt(row?.invoiceDate) },
              { key: "invoiceTotal", title: "Amount", render: (row) => money(row?.invoiceTotal) },
              { key: "paymentStatus", title: "Payment", type: "status" },
              { key: "purchaseOrderId", title: "Source link", render: (row) => row?.purchaseOrderId || "Awaiting purchase order service" },
            ]}
            emptyTitle="No procurement documents yet"
            emptyDescription="Supplier invoices will appear here as the V2 procurement document trail until dedicated purchase-order posting is added."
          />
        </SectionCard>
      );
    }

    if (activeModule.key === "grn") {
      return (
        <SectionCard title="Goods receipt waiting view" description="Use this queue to spot inbound receipt entries that warehouse and procurement teams should verify.">
          <DocumentTable
            rows={receiptQueue}
            columns={[
              { key: "referenceNo", title: "Receipt ref" },
              { key: "productName", title: "Product" },
              { key: "batchNo", title: "Batch" },
              { key: "warehouseName", title: "Warehouse" },
              { key: "qty", title: "Qty", render: (row) => Number(row?.qty || 0).toLocaleString() },
              { key: "movementType", title: "Movement", type: "status" },
            ]}
            emptyTitle="No GRN queue found"
            emptyDescription="Purchase receipt ledger entries will appear here once goods receipts are posted."
          />
        </SectionCard>
      );
    }

    return (
      <SectionCard title="Supplier invoice and payment status" description="Track open supplier invoice exposure and whether payment allocations are settling correctly.">
        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <DocumentTable
            rows={supplierInvoices}
            columns={[
              { key: "documentNo", title: "Invoice" },
              { key: "supplier", title: "Supplier", render: (row) => row?.supplier?.partyName || "-" },
              { key: "invoiceTotal", title: "Invoice total", render: (row) => money(row?.invoiceTotal) },
              { key: "allocatedPaymentTotal", title: "Allocated", render: (row) => money(row?.allocatedPaymentTotal) },
              { key: "balanceAmount", title: "Balance", render: (row) => money(row?.balanceAmount) },
              { key: "paymentStatus", title: "Status", type: "status" },
            ]}
            emptyTitle="No supplier invoices found"
            emptyDescription="Posted supplier invoices will show settlement status here."
          />
          <DocumentTable
            rows={supplierPayments}
            columns={[
              { key: "documentNo", title: "Payment" },
              { key: "supplier", title: "Supplier", render: (row) => row?.supplier?.partyName || "-" },
              { key: "amount", title: "Amount", render: (row) => money(row?.amount) },
              { key: "paymentMethod", title: "Method" },
              { key: "status", title: "Status", type: "status" },
              { key: "paymentDate", title: "Payment date", render: (row) => fmt(row?.paymentDate) },
            ]}
            emptyTitle="No supplier payments found"
            emptyDescription="Payment settlements created in the V2 finance bridge will appear here."
          />
        </div>
      </SectionCard>
    );
  }, [activeModule.key, dueInvoices, error, loading, overviewCards, purchaseReceiptRows.length, receiptQueue, supplierInvoices, supplierPayments, suppliers]);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Company · Purchase Manager"
        title="Procurement and supplier command center"
        description="This workspace brings together supplier readiness, procurement document visibility, goods receipt watchlists, and payment exposure using the V2 backend foundation."
        actions={(
          <>
            <Link href="/dashboards/admin/procurement/suppliers" className="rounded-2xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">Supplier master</Link>
            <Link href="/dashboards/admin/procurement/payments" className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">Supplier finance</Link>
          </>
        )}
      />
      <ModuleCardStrip items={MODULE_ITEMS} activeKey={activeModule.key} onSelect={setActiveModule} />
      {content}
    </div>
  );
}
