"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "../components/AdminShell";
import { apiFetch } from "../../../lib/api";

const cards = [
  {
    title: "Sales Performance",
    description: "Revenue, order volumes, and top customers across regions.",
    href: "/dashboards/admin/reports/sales",
  },
  {
    title: "Inventory Health",
    description: "Stock coverage, slow movers, and expiry exposure by warehouse.",
    href: "/dashboards/admin/reports/inventory",
  },
  {
    title: "Finance & Expenses",
    description: "Cash flow, expense approvals, and account balances overview.",
    href: "/dashboards/admin/reports/finance",
  },
  {
    title: "HR & Productivity",
    description: "Headcount, attendance, and role distribution snapshots.",
    href: "/dashboards/admin/reports/hr",
  },
  {
    title: "Logistics & Delivery",
    description: "On-time performance, fleet utilization, and route efficiency.",
    href: "/dashboards/admin/reports/logistics",
  },
  {
    title: "Compliance & Quality",
    description: "QC pass rates, audits, and non-conformance tracking.",
    href: "/dashboards/admin/reports/compliance",
  },
];

const defaultFilters = {
  period: "this_month",
  region: "all",
  warehouse: "all",
  status: "all",
};

export default function ReportsModulePage() {
  const [filters, setFilters] = useState(defaultFilters);
  const [metrics, setMetrics] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    async function loadOverview() {
      setErr("");
      try {
        const data = await apiFetch("/reports/overview");
        setMetrics(data.metrics || null);
      } catch (e) {
        setErr(e.message || "Failed to load reports overview");
      }
    }
    loadOverview();
  }, []);

  const quickMetrics = [
    {
      label: "Sales Orders",
      value: formatNumber(metrics?.totalSalesOrders),
      delta: `${formatNumber(metrics?.salesRegions)} regions`,
    },
    {
      label: "Total Expenses",
      value: formatCurrency(metrics?.totalExpenses),
      delta: `${formatNumber(metrics?.pendingExpenses)} pending`,
    },
    {
      label: "Active Users",
      value: formatNumber(metrics?.activeUsers),
      delta: `${formatNumber(metrics?.userRoles)} roles`,
    },
    {
      label: "Warehouses",
      value: formatNumber(metrics?.totalWarehouses),
      delta: `${formatNumber(metrics?.totalProducts)} products`,
    },
  ];

  const reportRows = [
    {
      title: "Sales Performance Snapshot",
      owner: "Finance",
      cadence: "Daily",
      lastRun: "Auto-updated",
      status: metrics ? "Ready" : "Draft",
    },
    {
      title: "Inventory Health Overview",
      owner: "Supply Chain",
      cadence: "Weekly",
      lastRun: "Auto-updated",
      status: metrics?.totalWarehouses ? "Ready" : "Draft",
    },
    {
      title: "Expense Category Tracker",
      owner: "Accounts",
      cadence: "Weekly",
      lastRun: "Auto-updated",
      status: metrics?.expenseCategories ? "Ready" : "Needs review",
    },
    {
      title: "Transfer Status Monitor",
      owner: "Logistics",
      cadence: "Daily",
      lastRun: "Auto-updated",
      status: metrics?.transferStatuses ? "Ready" : "Draft",
    },
  ];

  const filteredRows = useMemo(() => {
    if (filters.status === "all") return reportRows;
    return reportRows.filter((row) => row.status.toLowerCase() === filters.status);
  }, [filters.status]);

  return (
    <AdminShell title="Reports" user={null}>
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xl font-semibold text-zinc-900">Reports Center</div>
            <div className="text-sm text-zinc-500 mt-1">
              Build operational intelligence with curated dashboards across departments.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="rounded-xl border px-4 py-2 text-sm hover:bg-zinc-50">
              Schedule Report
            </button>
            <button className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700">
              Create Report
            </button>
          </div>
        </div>

        {err ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {err}
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {quickMetrics.map((metric) => (
            <div key={metric.label} className="rounded-2xl border bg-zinc-50 p-4">
              <div className="text-sm text-zinc-500">{metric.label}</div>
              <div className="text-2xl font-semibold text-zinc-900 mt-2">{metric.value}</div>
              <div className="text-xs text-emerald-600 mt-2">{metric.delta}</div>
            </div>
          ))}
        </div>

        <div className="mt-8">
          <div className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Department Report Library
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map((card) => (
              <a
                key={card.title}
                href={card.href}
                className="rounded-2xl border bg-white p-4 hover:shadow"
              >
                <div className="text-sm font-semibold text-zinc-900">{card.title}</div>
                <div className="text-xs text-zinc-500 mt-2">{card.description}</div>
              </a>
            ))}
          </div>
        </div>

        <div className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-lg font-semibold text-zinc-900">Report Builder</div>
              <div className="text-sm text-zinc-500">Filter, export, and distribute recurring reports.</div>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={filters.period}
                onChange={(e) => setFilters((s) => ({ ...s, period: e.target.value }))}
                className="rounded-xl border px-3 py-2 text-sm"
              >
                <option value="today">Today</option>
                <option value="this_week">This Week</option>
                <option value="this_month">This Month</option>
                <option value="this_quarter">This Quarter</option>
              </select>
              <select
                value={filters.region}
                onChange={(e) => setFilters((s) => ({ ...s, region: e.target.value }))}
                className="rounded-xl border px-3 py-2 text-sm"
              >
                <option value="all">All Regions</option>
                <option value="north">North</option>
                <option value="south">South</option>
                <option value="central">Central</option>
              </select>
              <select
                value={filters.warehouse}
                onChange={(e) => setFilters((s) => ({ ...s, warehouse: e.target.value }))}
                className="rounded-xl border px-3 py-2 text-sm"
              >
                <option value="all">All Warehouses</option>
                <option value="dhaka">Dhaka</option>
                <option value="chattogram">Chattogram</option>
                <option value="khulna">Khulna</option>
              </select>
              <select
                value={filters.status}
                onChange={(e) => setFilters((s) => ({ ...s, status: e.target.value }))}
                className="rounded-xl border px-3 py-2 text-sm"
              >
                <option value="all">All Statuses</option>
                <option value="ready">Ready</option>
                <option value="needs review">Needs review</option>
                <option value="draft">Draft</option>
              </select>
            </div>
          </div>

          <div className="mt-4 overflow-auto rounded-xl border">
            <table className="min-w-[780px] w-full text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="text-left px-3 py-2 border-b">Report Name</th>
                  <th className="text-left px-3 py-2 border-b">Owner</th>
                  <th className="text-left px-3 py-2 border-b">Cadence</th>
                  <th className="text-left px-3 py-2 border-b">Last Run</th>
                  <th className="text-left px-3 py-2 border-b">Status</th>
                  <th className="text-left px-3 py-2 border-b">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.title} className="hover:bg-zinc-50">
                    <td className="px-3 py-2 border-b font-medium text-zinc-900">{row.title}</td>
                    <td className="px-3 py-2 border-b">{row.owner}</td>
                    <td className="px-3 py-2 border-b">{row.cadence}</td>
                    <td className="px-3 py-2 border-b">{row.lastRun}</td>
                    <td className="px-3 py-2 border-b">
                      <StatusPill status={row.status} />
                    </td>
                    <td className="px-3 py-2 border-b">
                      <div className="flex flex-wrap gap-2">
                        <button className="rounded-lg border px-3 py-1.5 text-xs hover:bg-zinc-50">Run</button>
                        <button className="rounded-lg border px-3 py-1.5 text-xs hover:bg-zinc-50">Export</button>
                        <button className="rounded-lg border px-3 py-1.5 text-xs hover:bg-zinc-50">Share</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

function StatusPill({ status }) {
  const normalized = status.toLowerCase();
  const styles = {
    ready: "bg-emerald-50 text-emerald-700 border-emerald-200",
    "needs review": "bg-amber-50 text-amber-700 border-amber-200",
    draft: "bg-zinc-100 text-zinc-600 border-zinc-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs ${styles[normalized] || styles.draft}`}>
      {status}
    </span>
  );
}

function formatNumber(value) {
  if (value === null || value === undefined) return "—";
  return Number(value).toLocaleString();
}

function formatCurrency(value) {
  if (value === null || value === undefined) return "—";
  return `₨ ${Number(value).toLocaleString()}`;
}