"use client";

import { useEffect, useMemo, useState } from "react";
import { BRAND_CONFIG } from "@/src/config/brand";
import { apiGet } from "@/src/services/apiClient";
import { getRolePortalProfile, getCompanyPlan } from "@/src/config/erpAccessMatrix";

function num(value) { return Number(value || 0).toLocaleString(); }
function money(value) { return `PKR ${Number(value || 0).toLocaleString()}`; }
function pct(value) { return `${Number(value || 0).toFixed(0)}%`; }
function dateText(value) { if (!value) return "-"; const date = new Date(value); return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString(); }

function BarChart({ title, rows = [], valueKey = "value", labelKey = "label", formatter = num }) {
  const max = Math.max(...rows.map((row) => Number(row?.[valueKey] || 0)), 1);
  return <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
    <div className="mb-4 flex items-center justify-between gap-3"><h3 className="text-lg font-black text-slate-950">{title}</h3><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">Live chart</span></div>
    <div className="space-y-3">
      {rows.map((row, index) => {
        const value = Number(row?.[valueKey] || 0);
        return <div key={`${row?.[labelKey]}-${index}`}>
          <div className="mb-1 flex justify-between text-xs font-bold text-slate-500"><span>{row?.[labelKey] || "-"}</span><span>{formatter(value)}</span></div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500" style={{ width: `${Math.max(4, (value / max) * 100)}%` }} /></div>
        </div>;
      })}
      {!rows.length ? <p className="rounded-2xl bg-slate-50 p-4 text-center text-sm text-slate-400">No chart data yet.</p> : null}
    </div>
  </div>;
}

function FlowChart({ title, rows = [] }) {
  const max = Math.max(...rows.flatMap((row) => [Number(row.inbound || 0), Number(row.outbound || 0)]), 1);
  return <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
    <div className="mb-4 flex items-center justify-between gap-3"><h3 className="text-lg font-black text-slate-950">{title}</h3><span className="text-xs font-bold text-slate-400">Inbound / Outbound</span></div>
    <div className="space-y-3">
      {rows.map((row, index) => <div key={`${row.label}-${index}`} className="grid grid-cols-[56px_1fr] items-center gap-3">
        <span className="text-xs font-black text-slate-500">{row.label}</span>
        <div className="space-y-1">
          <div className="h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.max(3, (Number(row.inbound || 0) / max) * 100)}%` }} /></div>
          <div className="h-2 rounded-full bg-slate-100"><div className="h-full rounded-full bg-cyan-500" style={{ width: `${Math.max(3, (Number(row.outbound || 0) / max) * 100)}%` }} /></div>
        </div>
      </div>)}
      {!rows.length ? <p className="rounded-2xl bg-slate-50 p-4 text-center text-sm text-slate-400">No stock flow yet.</p> : null}
    </div>
  </div>;
}

function KpiCard({ label, value, help }) {
  return <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">{label}</p>
    <p className="mt-3 text-3xl font-black text-slate-950">{value}</p>
    <p className="mt-2 text-sm text-slate-500">{help}</p>
  </div>;
}


function PlanUsageCard({ user = {}, menu = [] }) {
  const plan = getCompanyPlan(user) || {};
  const used = user?.usage || user?.companyUsage || {};
  const limits = [
    ["Users", used.users ?? used.totalUsers, plan.userLimit],
    ["Branches", used.branches, plan.branchLimit],
    ["Warehouses", used.warehouses, plan.warehouseLimit],
    ["Mobile Users", used.mobileUsers, plan.mobileUserLimit],
    ["Modules", menu.length, plan.moduleLimit],
  ];
  return <div className="rounded-[2rem] border border-emerald-100 bg-white p-5 shadow-sm">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-600">Company Control Center</p>
        <h3 className="mt-2 text-xl font-black text-slate-950">{user?.companyName || "Company"} plan & access</h3>
        <p className="mt-1 text-sm text-slate-500">ERP type: {user?.erpTemplateKey || user?.businessType || "distribution_erp"} · Plan: {plan.name || plan.planName || plan.planKey || "Active plan"}</p>
      </div>
      <span className="rounded-full bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700">{plan.status || user?.companyStatus || "active"}</span>
    </div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {limits.map(([label, current, limit]) => <div key={label} className="rounded-2xl bg-slate-50 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="mt-1 text-xl font-black text-slate-950">{num(current || 0)} / {limit ? num(limit) : "∞"}</p>
      </div>)}
    </div>
  </div>;
}

function RecentList({ title, rows = [], type = "movement" }) {
  return <div className="rounded-[2rem] border border-slate-200 bg-white shadow-sm">
    <div className="border-b border-slate-100 p-4"><h3 className="font-black text-slate-950">{title}</h3><p className="text-xs text-slate-500">Latest {rows.length} records</p></div>
    <div className="divide-y divide-slate-100">
      {rows.map((row, index) => <div key={row._id || index} className="p-4 text-sm">
        <p className="font-black text-slate-800">{type === "expense" ? row.title || row.category || "Expense" : row.productName || row.documentNo || row.referenceNo || "Record"}</p>
        <p className="mt-1 text-xs text-slate-500">{type === "expense" ? `${money(row.amount)} · ${row.status || "draft"}` : `${row.movementType || row.status || "activity"} · ${dateText(row.postedAt || row.createdAt)}`}</p>
      </div>)}
      {!rows.length ? <p className="p-6 text-center text-sm text-slate-400">No recent records yet.</p> : null}
    </div>
  </div>;
}

export default function DynamicPortalHome({ user, menu = [] }) {
  const [state, setState] = useState({ loading: true, error: "", data: null });
  const profile = getRolePortalProfile(user || {});
  const isSystem = profile.scope === "system";

  useEffect(() => {
    let alive = true;
    if (isSystem) {
      setState({ loading: false, error: "", data: null });
      return () => { alive = false; };
    }
    apiGet("/dashboard/overview")
      .then((data) => alive && setState({ loading: false, error: "", data }))
      .catch((error) => alive && setState({ loading: false, error: error.message || "Unable to load dashboard KPIs", data: null }));
    return () => { alive = false; };
  }, [isSystem]);

  const data = state.data || {};
  const kpis = data.kpis || {};
  const charts = data.charts || {};
  const recent = data.recent || {};

  const headline = useMemo(() => isSystem ? [
    { label: "Owner Portal", value: "SaaS", help: "Client companies, plans, modules, and system users" },
    { label: "Allowed Modules", value: num(menu.length), help: "Only SaaS control modules are visible" },
    { label: "Portal Scope", value: "System", help: "Separated from company operations" },
    { label: "Brand", value: BRAND_CONFIG.name, help: "Ready for client onboarding" },
  ] : [
    { label: "Sales Orders", value: num(kpis.salesOrders), help: `${num(kpis.salesQuantity)} units ordered` },
    { label: "Revenue", value: money(kpis.totalRevenue), help: "Posted invoices and billing documents" },
    { label: "Stock On Hand", value: num(kpis.inventoryOnHand), help: "Ledger-based inventory balance" },
    { label: "Active Users", value: `${num(kpis.activeUsers)}/${num(kpis.totalUsers)}`, help: "Tenant users and mobile users" },
  ], [isSystem, kpis, menu.length]);

  return <div className="space-y-6">
    <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-950 via-emerald-900 to-cyan-700 p-7 text-white shadow-xl sm:p-9">
      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-white/70">{profile.label} Portal · {BRAND_CONFIG.name}</p>
      <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-4xl font-black tracking-tight">Welcome, {user?.fullName || user?.username || "ERP User"}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/80">Your dashboard is role-scoped. System Admin sees SaaS controls only, while company and field users see operational ERP KPIs, charts, and shortcuts.</p>
        </div>
        <div className="rounded-3xl bg-white/10 p-4 text-sm font-bold text-white/85 ring-1 ring-white/15">{data.meta?.scopeLabel || profile.scope} · {data.meta?.currentLabel || "Live"}</div>
      </div>
    </section>

    {state.error ? <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">{state.error}</div> : null}
    {state.loading ? <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">Loading dashboard KPIs and charts…</div> : null}

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{headline.map((item) => <KpiCard key={item.label} {...item} />)}</div>

    {!isSystem && profile.key === "company admin" ? <PlanUsageCard user={user} menu={menu} /> : null}

    {!isSystem ? <div className="grid gap-5 xl:grid-cols-2">
      <BarChart title="Sales Trend - Last 7 Days" rows={charts.salesTrend || []} />
      <FlowChart title="Inventory Flow - Last 7 Days" rows={charts.inventoryFlow || []} />
      <BarChart title="Monthly Revenue" rows={charts.monthlyRevenue || []} formatter={money} />
      <BarChart title="Daily Orders - Last 14 Days" rows={charts.dailyOrders || []} />
    </div> : null}

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {menu.slice(0, 8).map((item) => <a key={item.key} href={item.path} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">{item.category}</p><h3 className="mt-2 text-lg font-black text-slate-950">{item.name}</h3><p className="mt-1 text-sm text-slate-500">{item.description || "Open module"}</p></a>)}
    </section>

    {!isSystem ? <section className="grid gap-5 xl:grid-cols-3">
      <RecentList title="Recent Inventory Movements" rows={recent.movements || []} />
      <RecentList title="Recent Expenses" rows={recent.expenses || []} type="expense" />
      <RecentList title="Recent Transfers" rows={recent.transfers || []} />
    </section> : null}
  </div>;
}
