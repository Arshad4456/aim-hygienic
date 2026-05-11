"use client";

import { useEffect, useMemo, useState } from "react";
import reportsService from "@/src/services/reportsService";

const PERIODS = [
  ["day", "Today"],
  ["week", "Week"],
  ["month", "Month"],
  ["quarter", "Quarter"],
  ["year", "Year"],
  ["all", "All"],
];

function formatValue(value) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "number") return value.toLocaleString();
  return String(value);
}

function comparisonTone(tone) {
  if (tone === "positive") return "bg-emerald-50 text-emerald-700";
  if (tone === "negative") return "bg-rose-50 text-rose-700";
  return "bg-slate-100 text-slate-700";
}

function KpiCard({ item }) {
  return <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{item?.label || "KPI"}</p>
    <p className="mt-3 text-2xl font-black text-slate-950">{formatValue(item?.value)}</p>
    <p className="mt-2 text-sm text-slate-500">{item?.note || item?.help || "Live report value"}</p>
  </div>;
}

function ModuleCard({ module, active, onClick }) {
  const comparison = module?.comparison || {};
  return <button onClick={onClick} className={`rounded-3xl border p-5 text-left shadow-sm transition ${active ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-950 hover:border-cyan-300"}`}>
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className={`text-xs font-black uppercase tracking-[0.18em] ${active ? "text-cyan-100" : "text-emerald-600"}`}>{module?.badge || "ERP Report"}</p>
        <h3 className="mt-2 text-lg font-black">{module?.title || module?.key}</h3>
      </div>
      {comparison?.deltaText ? <span className={`rounded-full px-3 py-1 text-xs font-black ${active ? "bg-white/15 text-white" : comparisonTone(comparison.tone)}`}>{comparison.deltaText}</span> : null}
    </div>
    <p className={`mt-3 line-clamp-2 text-sm ${active ? "text-slate-200" : "text-slate-500"}`}>{module?.description || "Live module report."}</p>
    <div className="mt-4 grid grid-cols-2 gap-2">
      {(module?.kpis || []).slice(0, 2).map((kpi) => <div key={kpi.label} className={`rounded-2xl p-3 ${active ? "bg-white/10" : "bg-slate-50"}`}>
        <p className={`text-[10px] font-black uppercase tracking-wide ${active ? "text-cyan-100" : "text-slate-400"}`}>{kpi.label}</p>
        <p className="mt-1 text-sm font-black">{formatValue(kpi.value)}</p>
      </div>)}
    </div>
  </button>;
}

function DataTable({ table }) {
  const columns = Array.isArray(table?.columns) ? table.columns : [];
  const rows = Array.isArray(table?.rows) ? table.rows : [];
  return <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
    <div className="border-b border-slate-100 p-4">
      <h3 className="font-black text-slate-950">{table?.title || "Report table"}</h3>
      {table?.description ? <p className="mt-1 text-xs text-slate-500">{table.description}</p> : null}
    </div>
    <div className="overflow-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>{columns.map((column) => <th key={column} className="px-4 py-3">{column}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => <tr key={index} className="border-t border-slate-100">
            {(Array.isArray(row) ? row : Object.values(row || {})).map((cell, cellIndex) => <td key={cellIndex} className="px-4 py-3 text-slate-700">{formatValue(cell)}</td>)}
          </tr>)}
          {!rows.length ? <tr><td colSpan={columns.length || 1} className="px-4 py-8 text-center text-slate-400">No rows for this report yet.</td></tr> : null}
        </tbody>
      </table>
    </div>
  </div>;
}

export default function ReportsAutomationPage() {
  const [period, setPeriod] = useState("month");
  const [activeKey, setActiveKey] = useState("sales");
  const [payload, setPayload] = useState({ summary: {}, modules: [], meta: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const result = await reportsService.overview(period);
      setPayload(result || { summary: {}, modules: [], meta: {} });
      const firstKey = result?.modules?.[0]?.key;
      if (firstKey && !result.modules.some((item) => item.key === activeKey)) setActiveKey(firstKey);
    } catch (err) {
      setError(err?.message || "Unable to load reports.");
      setPayload({ summary: {}, modules: [], meta: {} });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [period]);

  const modules = payload.modules || [];
  const activeModule = useMemo(() => modules.find((item) => item.key === activeKey) || modules[0] || {}, [activeKey, modules]);
  const headlineKpis = payload.summary?.headlineKpis?.length ? payload.summary.headlineKpis : activeModule.kpis || [];

  return <div className="space-y-6">
    <div className="rounded-[2rem] bg-gradient-to-r from-slate-950 via-cyan-700 to-emerald-500 p-6 text-white shadow-lg">
      <p className="text-xs font-black uppercase tracking-[0.35em] text-cyan-100">Phase 14 Reports</p>
      <h2 className="mt-2 text-3xl font-black">Executive Reports, Module KPIs & Audit View</h2>
      <p className="mt-2 max-w-5xl text-sm text-cyan-50">Reports now load from the real V2 report engine. Sales, inventory, finance, users, logistics, compliance, and procurement are shown through one production portal instead of old testing links.</p>
    </div>

    <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-sm font-black text-slate-950">Scope: {payload.meta?.scopeLabel || "Current tenant"}</p>
        <p className="text-xs text-slate-500">Generated: {payload.meta?.generatedAt ? new Date(payload.meta.generatedAt).toLocaleString() : "waiting for report"}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {PERIODS.map(([key, label]) => <button key={key} onClick={() => setPeriod(key)} className={`rounded-full px-4 py-2 text-sm font-black ${period === key ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-600 ring-1 ring-slate-200"}`}>{label}</button>)}
        <button onClick={load} className="rounded-full bg-cyan-50 px-4 py-2 text-sm font-black text-cyan-700">Refresh</button>
      </div>
    </div>

    {error ? <div className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-600">{error}</div> : null}
    {loading ? <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-500 shadow-sm">Loading reports…</div> : null}

    {!loading ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{headlineKpis.slice(0, 4).map((item) => <KpiCard key={item.label} item={item} />)}</div> : null}

    {!loading ? <div className="grid gap-4 xl:grid-cols-3">
      {(payload.summary?.alerts || []).slice(0, 3).map((item, index) => <div key={`alert-${index}`} className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">Alert</p>
        <p className="mt-2 text-sm font-semibold text-amber-900">{item}</p>
      </div>)}
      {(payload.summary?.insights || []).slice(0, 3).map((item, index) => <div key={`insight-${index}`} className="rounded-3xl border border-cyan-200 bg-cyan-50 p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-700">Insight</p>
        <p className="mt-2 text-sm font-semibold text-cyan-900">{item}</p>
      </div>)}
    </div> : null}

    {!loading ? <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">{modules.map((module) => <ModuleCard key={module.key} module={module} active={activeModule.key === module.key} onClick={() => setActiveKey(module.key)} />)}</div> : null}

    {!loading && activeModule?.key ? <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-600">Focused Report</p>
          <h3 className="mt-2 text-2xl font-black text-slate-950">{activeModule.title}</h3>
          <p className="mt-2 max-w-4xl text-sm text-slate-500">{activeModule.description}</p>
        </div>
        {activeModule.comparison?.deltaText ? <span className={`rounded-full px-4 py-2 text-sm font-black ${comparisonTone(activeModule.comparison.tone)}`}>{activeModule.comparison.deltaText}</span> : null}
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">{(activeModule.kpis || []).map((item) => <KpiCard key={item.label} item={item} />)}</div>
    </div> : null}

    {!loading && activeModule?.tables?.length ? <div className="grid gap-5 xl:grid-cols-2">{activeModule.tables.map((table) => <DataTable key={table.title} table={table} />)}</div> : null}
  </div>;
}
