"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PageHeader from "../../../components/foundation/PageHeader";
import SectionCard from "../../../components/foundation/SectionCard";
import EmptyState from "../../../components/foundation/EmptyState";
import DocumentTable from "../../../components/foundation/DocumentTable";
import ModuleCardStrip from "../../../components/foundation/ModuleCardStrip";
import StatusBadge from "../../../components/foundation/StatusBadge";
import { v2Api } from "../../../lib/api";

function safeNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatNumber(value) {
  return safeNumber(value).toLocaleString();
}

function formatCurrency(value) {
  return `PKR ${formatNumber(value)}`;
}

function formatPercent(value) {
  return `${safeNumber(value).toFixed(1)}%`;
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function pickPrimaryMetric(module) {
  return Array.isArray(module?.kpis) && module.kpis.length ? module.kpis[0] : null;
}

function mapOverviewCards(summary = {}, financeTotals = {}) {
  return [
    {
      label: "Company orders",
      value: formatNumber(summary?.salesOrders),
      note: `${formatNumber(summary?.dispatchedOrders)} dispatched in V2`,
    },
    {
      label: "Inventory on hand",
      value: formatNumber(summary?.inventoryOnHand),
      note: "Derived from V2 inventory ledger",
    },
    {
      label: "Receivables",
      value: formatCurrency(financeTotals?.customerOutstanding + financeTotals?.distributorOutstanding),
      note: `${formatCurrency(financeTotals?.distributorOutstanding)} from distributors`,
    },
    {
      label: "Payables",
      value: formatCurrency(financeTotals?.supplierPayable),
      note: `${formatCurrency(financeTotals?.currentReceipts)} receipts in current window`,
    },
  ];
}

function aggregateDistributorPerformance(orders = []) {
  const grouped = new Map();

  for (const order of Array.isArray(orders) ? orders : []) {
    const distributorId = String(order?.distributorId || order?.distributor?.partyId || "unassigned");
    const distributorName =
      order?.distributor?.partyName || order?.distributor?.partyCode || order?.distributorId || "Unassigned distributor";
    const current = grouped.get(distributorId) || {
      _id: distributorId,
      distributor: distributorName,
      orders: 0,
      totalValue: 0,
      dispatched: 0,
      received: 0,
      unpaid: 0,
      lastOrderAt: null,
    };

    current.orders += 1;
    current.totalValue += safeNumber(order?.totals?.grandTotal);
    if (["dispatched", "received", "invoiced", "closed"].includes(String(order?.status || "").toLowerCase())) {
      current.dispatched += 1;
    }
    if (["received", "closed"].includes(String(order?.status || "").toLowerCase())) {
      current.received += 1;
    }
    if (["unpaid", "partial"].includes(String(order?.financialStatus || "").toLowerCase())) {
      current.unpaid += 1;
    }
    const createdAt = order?.createdAt ? new Date(order.createdAt) : null;
    if (createdAt && !Number.isNaN(createdAt.getTime())) {
      current.lastOrderAt = !current.lastOrderAt || createdAt > new Date(current.lastOrderAt) ? createdAt.toISOString() : current.lastOrderAt;
    }
    grouped.set(distributorId, current);
  }

  return [...grouped.values()].sort((a, b) => b.totalValue - a.totalValue).slice(0, 8);
}

const companyFocusCards = [
  { key: "operations", title: "Operations summary", description: "Dispatch health, backlog, and fulfillment readiness." },
  { key: "stock", title: "Company stock", description: "Ledger-based inventory view, flow, and warehouse coverage." },
  { key: "finance", title: "Receivable / payable", description: "Outstanding, current receipts, and supplier payable posture." },
  { key: "distributors", title: "Distributor snapshot", description: "Top distributors by supply order volume and settlement pressure." },
];

export default function CompanyAdminWorkspace() {
  const [activeCard, setActiveCard] = useState(companyFocusCards[0].key);
  const [overview, setOverview] = useState(null);
  const [operations, setOperations] = useState(null);
  const [inventoryReport, setInventoryReport] = useState(null);
  const [financeReport, setFinanceReport] = useState(null);
  const [companyOrders, setCompanyOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadWorkspace() {
    setLoading(true);
    setError("");
    try {
      const [overviewData, operationsData, inventoryData, financeData, orderData] = await Promise.all([
        v2Api.dashboard.overview(),
        v2Api.dashboard.operations(),
        v2Api.reports.inventory({ period: "month" }),
        v2Api.reports.finance({ period: "month" }),
        v2Api.orders.list({ family: "company_supply" }),
      ]);
      setOverview(overviewData);
      setOperations(operationsData);
      setInventoryReport(inventoryData);
      setFinanceReport(financeData);
      setCompanyOrders(Array.isArray(orderData?.orders) ? orderData.orders : []);
    } catch (err) {
      setError(err.message || "Failed to load company admin workspace");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWorkspace();
  }, []);

  const financeTotals = financeReport?.totals || {};
  const heroCards = useMemo(() => mapOverviewCards(overview?.kpis, financeTotals), [overview?.kpis, financeTotals]);
  const topDistributorRows = useMemo(() => aggregateDistributorPerformance(companyOrders), [companyOrders]);
  const inventoryPrimaryMetric = pickPrimaryMetric(inventoryReport?.module);
  const financePrimaryMetric = pickPrimaryMetric(financeReport?.module);

  const operationalHealth = useMemo(() => {
    const kpis = operations?.kpis || {};
    return [
      {
        label: "Fill rate",
        value: formatPercent(kpis.orderFillRate),
        note: `${formatNumber(kpis.dispatchedOrders)} dispatched / ${formatNumber(kpis.totalOrders)} total`,
      },
      {
        label: "On-time completion",
        value: formatPercent(kpis.onTimeDispatchRate),
        note: `${formatNumber(kpis.completedOrders)} completed`,
      },
      {
        label: "Cycle time",
        value: `${safeNumber(kpis.cycleTimeHours).toFixed(1)} hrs`,
        note: "Average completed order cycle",
      },
      {
        label: "Backlog",
        value: formatNumber(kpis.backlogOrders),
        note: `${formatNumber(kpis.approvedOrders)} approved waiting flow`,
      },
    ];
  }, [operations]);

  const stockSnapshot = useMemo(() => {
    const inventoryKpis = Array.isArray(inventoryReport?.module?.kpis) ? inventoryReport.module.kpis : [];
    return [
      inventoryPrimaryMetric || { label: "Inventory on hand", value: formatNumber(overview?.kpis?.inventoryOnHand), note: "Derived from V2 inventory ledger" },
      inventoryKpis[1] || { label: "Movement volume", value: formatNumber(overview?.kpis?.salesQuantity), note: "Movement quantity in current period" },
      inventoryKpis[2] || { label: "Warehouses", value: formatNumber(overview?.modules?.warehouses), note: "Configured warehouse footprint" },
      inventoryKpis[3] || { label: "Products", value: formatNumber(overview?.modules?.products), note: "Products with active stock trail" },
    ];
  }, [inventoryPrimaryMetric, inventoryReport?.module?.kpis, overview?.kpis?.inventoryOnHand, overview?.kpis?.salesQuantity, overview?.modules?.warehouses, overview?.modules?.products]);

  const financeSnapshot = useMemo(() => {
    const financeKpis = Array.isArray(financeReport?.module?.kpis) ? financeReport.module.kpis : [];
    return [
      financePrimaryMetric || { label: "Account balances", value: formatCurrency(0), note: "Account visibility will grow with finance setup" },
      financeKpis[1] || { label: "Current receipts", value: formatCurrency(financeTotals?.currentReceipts), note: "Receipts posted in current period" },
      financeKpis[2] || { label: "Distributor outstanding", value: formatCurrency(financeTotals?.distributorOutstanding), note: "Distributor AR to company" },
      financeKpis[3] || { label: "Supplier payable", value: formatCurrency(financeTotals?.supplierPayable), note: "Open supplier bills" },
    ];
  }, [financePrimaryMetric, financeReport?.module?.kpis, financeTotals]);

  const distributorColumns = [
    { key: "distributor", title: "Distributor" },
    { key: "orders", title: "Orders", render: (row) => formatNumber(row.orders) },
    { key: "totalValue", title: "Value", render: (row) => formatCurrency(row.totalValue) },
    { key: "dispatched", title: "Dispatched", render: (row) => formatNumber(row.dispatched) },
    { key: "received", title: "Received", render: (row) => formatNumber(row.received) },
    {
      key: "unpaid",
      title: "Financial Pressure",
      render: (row) => (
        <StatusBadge
          value={row.unpaid ? `${formatNumber(row.unpaid)} open` : "Stable"}
          tone={row.unpaid ? "pending" : "approved"}
        />
      ),
    },
    { key: "lastOrderAt", title: "Last order", render: (row) => formatDate(row.lastOrderAt) },
  ];

  const quickLinks = [
    { title: "Operations command center", href: "/dashboards/admin/operations" },
    { title: "Procurement & suppliers", href: "/dashboards/admin/procurement" },
    { title: "Warehouse & inventory", href: "/dashboards/admin/warehouse-inventory" },
    { title: "Dispatch & logistics", href: "/dashboards/admin/logistics" },
    { title: "Finance & accounts", href: "/dashboards/admin/finance" },
    { title: "Live tracking", href: "/dashboards/admin/live-tracking" },
    { title: "Reports workspace", href: "/dashboards/admin/reports" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Company Admin"
        title="Company command center"
        description="Run the company through one V2-first workspace: operations health, stock posture, finance exposure, and distributor performance all in one landing view."
        actions={
          <>
            <button
              type="button"
              onClick={loadWorkspace}
              className="rounded-2xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Refresh workspace
            </button>
            <Link href="/dashboards/admin/reports" className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
              Open reports
            </Link>
          </>
        }
      />

      {error ? <div className="rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {heroCards.map((card) => (
          <SectionCard key={card.label} className="bg-gradient-to-br from-white to-zinc-50">
            <div className="text-sm font-medium text-zinc-500">{card.label}</div>
            <div className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">{card.value}</div>
            <div className="mt-2 text-xs text-zinc-500">{card.note}</div>
          </SectionCard>
        ))}
      </div>

      <SectionCard title="Core company focus" description="Use one strip to move between the most important company-admin summary blocks.">
        <ModuleCardStrip items={companyFocusCards} activeKey={activeCard} onSelect={(item) => setActiveCard(item.key)} />
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <SectionCard
          title={
            activeCard === "operations"
              ? "Operations summary"
              : activeCard === "stock"
              ? "Company stock summary"
              : activeCard === "finance"
              ? "Receivable / payable snapshot"
              : "Distributor performance snapshot"
          }
          description={
            activeCard === "operations"
              ? "Watch execution throughput, backlog, and dispatch readiness from V2 order and dispatch signals."
              : activeCard === "stock"
              ? "Ledger-based inventory summary for the company side of the business."
              : activeCard === "finance"
              ? "Monitor cash posture, open balances, and supplier/distributor exposure."
              : "Review how distributors are performing against company supply orders."
          }
        >
          {loading ? (
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-8 text-sm text-zinc-500">Loading company workspace...</div>
          ) : activeCard === "operations" ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {operationalHealth.map((item) => (
                <div key={item.label} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                  <div className="text-sm font-medium text-zinc-500">{item.label}</div>
                  <div className="mt-2 text-2xl font-semibold text-zinc-950">{item.value}</div>
                  <div className="mt-2 text-xs text-zinc-500">{item.note}</div>
                </div>
              ))}
            </div>
          ) : activeCard === "stock" ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {stockSnapshot.map((item) => (
                <div key={item.label} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                  <div className="text-sm font-medium text-zinc-500">{item.label}</div>
                  <div className="mt-2 text-2xl font-semibold text-zinc-950">{item.value}</div>
                  <div className="mt-2 text-xs text-zinc-500">{item.note}</div>
                </div>
              ))}
            </div>
          ) : activeCard === "finance" ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {financeSnapshot.map((item) => (
                <div key={item.label} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                  <div className="text-sm font-medium text-zinc-500">{item.label}</div>
                  <div className="mt-2 text-2xl font-semibold text-zinc-950">{item.value}</div>
                  <div className="mt-2 text-xs text-zinc-500">{item.note}</div>
                </div>
              ))}
            </div>
          ) : topDistributorRows.length ? (
            <DocumentTable
              columns={distributorColumns}
              rows={topDistributorRows}
              emptyTitle="No distributor activity yet"
              emptyDescription="Distributor supply performance will appear once company supply orders are created and dispatched."
            />
          ) : (
            <EmptyState
              title="No distributor activity yet"
              description="Distributor supply performance will appear once company supply orders are created and dispatched."
            />
          )}
        </SectionCard>

        <div className="space-y-6">
          <SectionCard title="Operational attention" description="Immediate items company admin should monitor before moving into detailed modules.">
            {loading ? (
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-8 text-sm text-zinc-500">Loading alerts...</div>
            ) : operations?.alerts?.length ? (
              <div className="space-y-3">
                {operations.alerts.map((alert, index) => (
                  <div key={`${alert.title}-${index}`} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-zinc-900">{alert.title}</div>
                      <StatusBadge value={alert.tone === "emerald" ? "Stable" : alert.tone === "blue" ? "Watch" : "Action"} tone={alert.tone === "emerald" ? "approved" : "pending"} />
                    </div>
                    <div className="mt-2 text-sm text-zinc-600">{alert.detail}</div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No operational alerts" description="The company operation layer is stable for the selected V2 window." />
            )}
          </SectionCard>

          <SectionCard title="Distributor settlement posture" description="Quick financial read before opening the finance workspace.">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                <div className="text-sm font-medium text-zinc-500">Distributor outstanding</div>
                <div className="mt-2 text-2xl font-semibold text-zinc-950">{formatCurrency(financeTotals?.distributorOutstanding)}</div>
                <div className="mt-2 text-xs text-zinc-500">Open company invoices issued to distributors</div>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                <div className="text-sm font-medium text-zinc-500">Supplier payable</div>
                <div className="mt-2 text-2xl font-semibold text-zinc-950">{formatCurrency(financeTotals?.supplierPayable)}</div>
                <div className="mt-2 text-xs text-zinc-500">Outstanding supplier commitments in V2</div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Quick navigation" description="Move directly into the operational modules behind this summary workspace.">
            <div className="grid gap-3">
              {quickLinks.map((item) => (
                <Link key={item.href} href={item.href} className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
                  {item.title}
                </Link>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
