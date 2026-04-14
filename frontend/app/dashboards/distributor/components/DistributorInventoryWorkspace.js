"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import UserDashboardShell from "../../components/userDashboardShell";
import { userDashboardSearchItems } from "../../searchItems";
import { getAuthSnapshot } from "../../../lib/clientAuth";
import { v2Api } from "../../../lib/api";
import PageHeader from "../../../components/foundation/PageHeader";
import SectionCard from "../../../components/foundation/SectionCard";
import ModuleCardStrip from "../../../components/foundation/ModuleCardStrip";
import DocumentTable from "../../../components/foundation/DocumentTable";
import EmptyState from "../../../components/foundation/EmptyState";

const SECTION_ITEMS = [
  { key: "overview", title: "Inventory dashboard", description: "Distributor stock control, intake from company, and operational risk in one place." },
  { key: "stock-received", title: "Stock received", description: "Goods received from company supply and recent inbound confirmation." },
  { key: "stock-availability", title: "Stock availability", description: "Available stock by product and batch for downstream customer sales." },
  { key: "stock-movements", title: "Stock movements", description: "Distributor inventory ledger with inward, outward, and return visibility." },
  { key: "return-stock", title: "Return stock", description: "Recent return documents and quick access to distributor return workflows." },
  { key: "stock-adjustment", title: "Stock adjustment", description: "Adjustment and manual correction visibility for distributor inventory." },
  { key: "damage-expiry", title: "Damage & expiry", description: "Expiry risk, damaged stock, and at-risk availability signals." },
];

function safeNumber(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
}

function formatCurrency(value) {
  return `PKR ${safeNumber(value).toLocaleString()}`;
}

function normalizeRows(response) {
  return Array.isArray(response?.rows) ? response.rows : [];
}

function normalizeReturns(response) {
  return Array.isArray(response?.returns) ? response.returns : [];
}

function normalizeInvoices(response) {
  return Array.isArray(response?.invoices) ? response.invoices : [];
}

function buildAvailabilityRows(rows = []) {
  const map = new Map();

  (rows || []).forEach((row) => {
    if (String(row?.ownerType || "") !== "distributor") return;
    const key = [row?.productId || row?.productCode || row?.productName || "product", row?.batchNo || "batchless"].join("::");
    const current = map.get(key) || {
      _id: key,
      productName: row?.productName || row?.productCode || row?.productId || "Unnamed product",
      productCode: row?.productCode || row?.productId || "-",
      batchNo: row?.batchNo || "General",
      inboundQty: 0,
      outboundQty: 0,
      availableQty: 0,
      totalValue: 0,
      lastPostedAt: row?.postedAt || row?.createdAt,
    };

    const qty = safeNumber(row?.qty);
    if (String(row?.direction || "").toLowerCase() === "in") current.inboundQty += qty;
    else current.outboundQty += qty;
    current.availableQty = current.inboundQty - current.outboundQty;
    current.totalValue += safeNumber(row?.totalValue);

    const currentTime = new Date(current.lastPostedAt || 0).getTime();
    const nextTime = new Date(row?.postedAt || row?.createdAt || 0).getTime();
    if (nextTime > currentTime) current.lastPostedAt = row?.postedAt || row?.createdAt;

    map.set(key, current);
  });

  return [...map.values()].sort((a, b) => b.availableQty - a.availableQty);
}

export default function DistributorInventoryWorkspace({ initialSection = "overview" }) {
  const auth = useMemo(() => getAuthSnapshot(), []);
  const distributorId = useMemo(
    () => String(auth?.user?.distributorId || auth?.payload?.distributorId || auth?.user?.uid || "").trim(),
    [auth],
  );

  const [activeSection, setActiveSection] = useState(() => SECTION_ITEMS.find((item) => item.key === initialSection) || SECTION_ITEMS[0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [inventoryReport, setInventoryReport] = useState(null);
  const [ledgerRows, setLedgerRows] = useState([]);
  const [companyInvoices, setCompanyInvoices] = useState([]);
  const [returns, setReturns] = useState([]);
  const [lowStockRows, setLowStockRows] = useState([]);
  const [nearExpiryRows, setNearExpiryRows] = useState([]);

  useEffect(() => {
    const matched = SECTION_ITEMS.find((item) => item.key === initialSection);
    if (matched) setActiveSection(matched);
  }, [initialSection]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError("");

      const responses = await Promise.allSettled([
        v2Api.distributor.inventoryReport(),
        v2Api.distributor.inventoryLedger(),
        v2Api.distributor.listCompanyInvoices(),
        v2Api.distributor.listReturns({ status: "all" }),
        v2Api.distributor.lowStock(),
        v2Api.distributor.nearExpiry(),
      ]);

      if (!mounted) return;

      const [inventoryRes, ledgerRes, companyInvoiceRes, returnRes, lowStockRes, nearExpiryRes] = responses;

      if (inventoryRes.status === "fulfilled") setInventoryReport(inventoryRes.value?.module || inventoryRes.value || null);
      if (ledgerRes.status === "fulfilled") setLedgerRows(normalizeRows(ledgerRes.value));
      if (companyInvoiceRes.status === "fulfilled") setCompanyInvoices(normalizeInvoices(companyInvoiceRes.value));
      if (returnRes.status === "fulfilled") setReturns(normalizeReturns(returnRes.value));
      if (lowStockRes.status === "fulfilled") setLowStockRows(Array.isArray(lowStockRes.value?.rows) ? lowStockRes.value.rows : Array.isArray(lowStockRes.value?.items) ? lowStockRes.value.items : []);
      if (nearExpiryRes.status === "fulfilled") setNearExpiryRows(Array.isArray(nearExpiryRes.value?.rows) ? nearExpiryRes.value.rows : Array.isArray(nearExpiryRes.value?.products) ? nearExpiryRes.value.products : []);

      const failure = responses.find((entry) => entry.status === "rejected");
      if (failure) setError(failure.reason?.message || "Some distributor inventory signals could not be loaded.");
      setLoading(false);
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const inventoryKpis = useMemo(() => Array.isArray(inventoryReport?.kpis) ? inventoryReport.kpis : Array.isArray(inventoryReport?.module?.kpis) ? inventoryReport.module.kpis : [], [inventoryReport]);

  const distributorLedgerRows = useMemo(() => {
    const rows = Array.isArray(ledgerRows) ? ledgerRows : [];
    return rows.filter((row) => String(row?.ownerType || "") === "distributor" && (!distributorId || String(row?.ownerId || row?.distributorId || "") === distributorId));
  }, [ledgerRows, distributorId]);

  const receivedRows = useMemo(
    () => distributorLedgerRows.filter((row) => String(row?.movementType || "").toLowerCase() === "distributor_receipt").slice(0, 20),
    [distributorLedgerRows],
  );
  const movementRows = useMemo(() => distributorLedgerRows.slice(0, 30), [distributorLedgerRows]);
  const adjustmentRows = useMemo(
    () => distributorLedgerRows.filter((row) => ["adjustment_in", "adjustment_out"].includes(String(row?.movementType || "").toLowerCase())).slice(0, 20),
    [distributorLedgerRows],
  );
  const damageRows = useMemo(
    () => distributorLedgerRows.filter((row) => ["damage_out", "expiry_out"].includes(String(row?.movementType || "").toLowerCase())).slice(0, 20),
    [distributorLedgerRows],
  );
  const availabilityRows = useMemo(() => buildAvailabilityRows(distributorLedgerRows).slice(0, 25), [distributorLedgerRows]);
  const payablesOpenValue = useMemo(
    () => companyInvoices.reduce((sum, row) => sum + safeNumber(row?.balanceAmount || row?.invoiceTotal), 0),
    [companyInvoices],
  );
  const receivedValue = useMemo(
    () => companyInvoices.reduce((sum, row) => sum + safeNumber(row?.invoiceTotal || row?.totals?.grandTotal), 0),
    [companyInvoices],
  );
  const availableQty = useMemo(
    () => availabilityRows.reduce((sum, row) => sum + safeNumber(row?.availableQty), 0),
    [availabilityRows],
  );

  const overviewCards = useMemo(
    () => [
      { label: "Stock received", value: receivedRows.length.toLocaleString(), helper: `${formatCurrency(receivedValue)} company stock value received` },
      { label: "Available quantity", value: availableQty.toLocaleString(), helper: `${availabilityRows.length} active batch/product lines • ${inventoryKpis.length} KPI markers` },
      { label: "Open payable", value: formatCurrency(payablesOpenValue), helper: `${companyInvoices.length} company invoices pending settlement` },
      { label: "Return documents", value: returns.length.toLocaleString(), helper: "Customer and distributor return activity in current scope" },
      { label: "Low stock alerts", value: lowStockRows.length.toLocaleString(), helper: "Products that need replenishment planning" },
      { label: "Damage / expiry", value: (damageRows.length + nearExpiryRows.length).toLocaleString(), helper: "Posted damage and upcoming expiry exposure" },
    ],
    [receivedRows.length, receivedValue, availableQty, availabilityRows.length, inventoryKpis.length, payablesOpenValue, companyInvoices.length, returns.length, lowStockRows.length, damageRows.length, nearExpiryRows.length],
  );

  const stockReceivedColumns = [
    { key: "referenceNo", title: "Receipt ref" },
    { key: "warehouseName", title: "Warehouse", render: (row) => row?.warehouseName || row?.warehouseId || "Distributor warehouse" },
    { key: "productName", title: "Product" },
    { key: "qty", title: "Qty received", render: (row) => safeNumber(row?.qty).toLocaleString() },
    { key: "totalValue", title: "Value", render: (row) => formatCurrency(row?.totalValue) },
    { key: "postedAt", title: "Received at", render: (row) => formatDate(row?.postedAt || row?.createdAt) },
  ];

  const availabilityColumns = [
    { key: "productName", title: "Product" },
    { key: "batchNo", title: "Batch" },
    { key: "availableQty", title: "Available", render: (row) => safeNumber(row?.availableQty).toLocaleString() },
    { key: "inboundQty", title: "Inbound", render: (row) => safeNumber(row?.inboundQty).toLocaleString() },
    { key: "outboundQty", title: "Outbound", render: (row) => safeNumber(row?.outboundQty).toLocaleString() },
    { key: "lastPostedAt", title: "Last movement", render: (row) => formatDate(row?.lastPostedAt) },
  ];

  const movementColumns = [
    { key: "referenceNo", title: "Reference" },
    { key: "movementType", title: "Movement" },
    { key: "direction", title: "Direction" },
    { key: "productName", title: "Product" },
    { key: "qty", title: "Qty", render: (row) => safeNumber(row?.qty).toLocaleString() },
    { key: "postedAt", title: "Posted at", render: (row) => formatDate(row?.postedAt || row?.createdAt) },
  ];

  const returnColumns = [
    { key: "documentNo", title: "Return" },
    { key: "returnType", title: "Type" },
    { key: "status", title: "Status", type: "status", render: (row) => row?.status || "draft" },
    { key: "fromParty", title: "From", render: (row) => row?.fromParty?.partyName || row?.fromParty?.partyCode || "-" },
    { key: "toParty", title: "To", render: (row) => row?.toParty?.partyName || row?.toParty?.partyCode || "-" },
    { key: "createdAt", title: "Created", render: (row) => formatDate(row?.createdAt) },
  ];

  const adjustmentColumns = [
    { key: "referenceNo", title: "Reference" },
    { key: "movementType", title: "Adjustment" },
    { key: "productName", title: "Product" },
    { key: "qty", title: "Qty", render: (row) => safeNumber(row?.qty).toLocaleString() },
    { key: "postedAt", title: "Posted at", render: (row) => formatDate(row?.postedAt || row?.createdAt) },
  ];

  const damageColumns = [
    { key: "productName", title: "Product" },
    { key: "movementType", title: "Signal" },
    { key: "qty", title: "Qty", render: (row) => safeNumber(row?.qty).toLocaleString() },
    { key: "postedAt", title: "Posted at", render: (row) => formatDate(row?.postedAt || row?.createdAt) },
  ];

  const nearExpiryColumns = [
    { key: "productName", title: "Product", render: (row) => row?.productName || row?.name || "Product" },
    { key: "batchNo", title: "Batch", render: (row) => row?.batchNo || row?.batch || "-" },
    { key: "quantity", title: "Qty", render: (row) => safeNumber(row?.quantity || row?.qty || row?.stock).toLocaleString() },
    { key: "expiryDate", title: "Expiry", render: (row) => formatDate(row?.expiryDate || row?.expiry) },
  ];

  const content = useMemo(() => {
    if (loading) {
      return <EmptyState title="Loading distributor inventory" description="Fetching stock signals, ledger movements, and return activity from the V2 backend." />;
    }

    if (activeSection.key === "overview") {
      return (
        <div className="space-y-5">
          <SectionCard title="Distributor store control" description="Track received stock, usable availability, return risk, and payable-to-company pressure from one V2 inventory workspace.">
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
            <SectionCard title="Recent stock received" description="Most recent distributor inventory receipts coming from company dispatch and supply billing.">
              <DocumentTable
                columns={stockReceivedColumns}
                rows={receivedRows.slice(0, 8)}
                emptyTitle="No stock receipts yet"
                emptyDescription="Distributor stock receipts will appear here after company supply is received and posted."
              />
            </SectionCard>
            <SectionCard title="Quick actions" description="Jump to the most important distributor store operations.">
              <div className="grid gap-3">
                {[
                  { title: "Primary order request", href: "/dashboards/distributor/primary-order-request", note: "Ask company for replenishment stock." },
                  { title: "Return stock", href: "/dashboards/distributor/return-stock", note: "Create and manage distributor return documents." },
                  { title: "Secondary orders", href: "/dashboards/distributor/orders", note: "Move stock downstream to customer sales." },
                  { title: "Payable to company", href: "/dashboards/distributor/payments", note: "Review open company invoices and settlement pressure." },
                ].map((item) => (
                  <Link key={item.href} href={item.href} className="rounded-2xl border border-zinc-200 bg-white px-4 py-4 text-left shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50">
                    <div className="text-sm font-semibold text-zinc-900">{item.title}</div>
                    <div className="mt-1 text-sm text-zinc-600">{item.note}</div>
                  </Link>
                ))}
              </div>
            </SectionCard>
          </div>
        </div>
      );
    }

    if (activeSection.key === "stock-received") {
      return (
        <SectionCard title="Stock received from company" description="Inbound distributor stock confirmed through V2 distributor-receipt ledger rows.">
          <DocumentTable
            columns={stockReceivedColumns}
            rows={receivedRows}
            emptyTitle="No distributor receipts captured"
            emptyDescription="Post distributor stock receipts after company dispatch to populate this section."
          />
        </SectionCard>
      );
    }

    if (activeSection.key === "stock-availability") {
      return (
        <div className="space-y-5">
          <SectionCard title="Available stock by product and batch" description="Use this view to understand what can be sold downstream and what is still blocked in operational movement.">
            <DocumentTable
              columns={availabilityColumns}
              rows={availabilityRows}
              emptyTitle="No stock availability yet"
              emptyDescription="Distributor inventory availability will appear here once stock receipts are posted."
            />
          </SectionCard>
          <SectionCard title="Open payable to company" description="Current company invoices connected to stock already received into distributor operations.">
            <DocumentTable
              columns={[
                { key: "documentNo", title: "Invoice" },
                { key: "invoiceTotal", title: "Invoice total", render: (row) => formatCurrency(row?.invoiceTotal || row?.totals?.grandTotal) },
                { key: "balanceAmount", title: "Balance", render: (row) => formatCurrency(row?.balanceAmount || row?.invoiceTotal) },
                { key: "paymentStatus", title: "Payment", type: "status", render: (row) => row?.paymentStatus || "unpaid" },
                { key: "invoiceDate", title: "Date", render: (row) => formatDate(row?.invoiceDate || row?.createdAt) },
              ]}
              rows={companyInvoices.slice(0, 10)}
              emptyTitle="No company invoices"
              emptyDescription="Company-distributor invoices will show here when the finance bridge posts invoices against received stock."
            />
          </SectionCard>
        </div>
      );
    }

    if (activeSection.key === "stock-movements") {
      return (
        <SectionCard title="Distributor stock movements" description="Inward, outward, and return-related movements from the V2 inventory ledger.">
          <DocumentTable
            columns={movementColumns}
            rows={movementRows}
            emptyTitle="No movement rows"
            emptyDescription="Distributor inventory movements will show here after receipts, dispatches, adjustments, and returns are posted."
          />
        </SectionCard>
      );
    }

    if (activeSection.key === "return-stock") {
      return (
        <div className="space-y-5">
          <SectionCard
            title="Return stock visibility"
            description="Review recent return documents and continue deeper processing from the dedicated distributor return-stock module."
          >
            <DocumentTable
              columns={returnColumns}
              rows={returns}
              emptyTitle="No return documents yet"
              emptyDescription="Distributor and customer return documents will appear here once created in the return-stock workflow."
            />
          </SectionCard>
          <SectionCard title="Continue return workflow" description="Open the dedicated return-stock page to create new return documents or continue approval/posting flow.">
            <Link
              href="/dashboards/distributor/return-stock"
              className="inline-flex rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700"
            >
              Open return-stock module
            </Link>
          </SectionCard>
        </div>
      );
    }

    if (activeSection.key === "stock-adjustment") {
      return (
        <SectionCard title="Stock adjustment visibility" description="Monitor adjustment rows and manual inventory corrections for distributor stock control.">
          <DocumentTable
            columns={adjustmentColumns}
            rows={adjustmentRows}
            emptyTitle="No stock adjustments yet"
            emptyDescription="Adjustment rows will appear here when inventory corrections are posted to the distributor ledger."
          />
        </SectionCard>
      );
    }

    return (
      <div className="space-y-5">
        <SectionCard title="Damage & expiry" description="Posted shrinkage and upcoming expiry exposure for distributor inventory.">
          <DocumentTable
            columns={damageColumns}
            rows={damageRows}
            emptyTitle="No damage or expiry ledger rows"
            emptyDescription="Damage and expiry rows will appear here once posted through the distributor inventory workflows."
          />
        </SectionCard>
        <SectionCard title="Near-expiry products" description="Products that need action before they become a financial loss for the distributor.">
          <DocumentTable
            columns={nearExpiryColumns}
            rows={nearExpiryRows}
            emptyTitle="No near-expiry products"
            emptyDescription="Near-expiry products will appear here when the inventory report flags batch/date risk."
          />
        </SectionCard>
      </div>
    );
  }, [
    activeSection.key,
    adjustmentRows,
    availabilityColumns,
    availabilityRows,
    companyInvoices,
    damageColumns,
    damageRows,
    loading,
    movementRows,
    nearExpiryColumns,
    nearExpiryRows,
    overviewCards,
    receivedRows,
    returnColumns,
    returns,
    stockReceivedColumns,
  ]);

  return (
    <UserDashboardShell
      title="Distributor Inventory"
      subtitle="Control stock received from company, product availability, returns, and inventory risk from one V2-first workspace."
      roleKey="Distributor Store Manager"
      links={userDashboardSearchItems.distributorStoreManager || userDashboardSearchItems.distributor || []}
      showAccountCards
    >
      <div className="space-y-5">
        <PageHeader
          eyebrow="Distributor Store Manager"
          title="Distributor inventory command center"
          description="A dedicated inventory workspace for received stock, available batches, stock movement, returns, adjustments, and damage / expiry control."
          actions={
            <>
              <Link href="/dashboards/distributor/primary-order-request" className="rounded-2xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50">
                Request stock
              </Link>
              <Link href="/dashboards/distributor/return-stock" className="rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700">
                Return stock
              </Link>
            </>
          }
        />

        {error ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {error}
          </div>
        ) : null}

        <ModuleCardStrip items={SECTION_ITEMS} activeKey={activeSection.key} onSelect={setActiveSection} />
        {content}
      </div>
    </UserDashboardShell>
  );
}
