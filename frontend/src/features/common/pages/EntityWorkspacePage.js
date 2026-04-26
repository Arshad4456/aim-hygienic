"use client";

import { useEffect, useMemo, useState } from "react";
import apiClient from "../../../services/apiClient";

function readArray(payload, keys = []) {
  if (Array.isArray(payload)) return payload;
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
    if (Array.isArray(payload?.data?.[key])) return payload.data[key];
  }
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.records)) return payload.records;
  if (payload && typeof payload === "object") {
    const firstArray = Object.values(payload).find(Array.isArray);
    if (firstArray) return firstArray;
  }
  return [];
}

function readValue(row, accessor) {
  if (typeof accessor === "function") return accessor(row);
  return String(accessor || "").split(".").reduce((value, key) => value?.[key], row);
}

function formatCell(value) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "number") return Number(value).toLocaleString();
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return `${value.length} items`;
  if (typeof value === "object") return value.name || value.title || value.partyName || value.companyName || value.fullName || value.username || value._id || "Record";
  return String(value);
}

function statusPill(value) {
  const text = formatCell(value);
  const safe = text.toLowerCase();
  const color = safe.includes("active") || safe.includes("paid") || safe.includes("posted") || safe.includes("approved")
    ? "bg-emerald-50 text-emerald-700"
    : safe.includes("pending") || safe.includes("draft") || safe.includes("partial")
      ? "bg-amber-50 text-amber-700"
      : "bg-slate-100 text-slate-700";
  return <span className={`rounded-full px-3 py-1 text-xs font-black ${color}`}>{text}</span>;
}

export default function EntityWorkspacePage({
  eyebrow = "Phase 11 Portal Conversion",
  title,
  description,
  endpoint,
  recordsKeys = [],
  columns = [],
  kpis = [],
  workflows = [],
  emptyText = "No records found yet.",
  createHint,
}) {
  const [loading, setLoading] = useState(Boolean(endpoint));
  const [error, setError] = useState("");
  const [payload, setPayload] = useState({});
  const [query, setQuery] = useState("");

  async function load() {
    if (!endpoint) return;
    setLoading(true);
    setError("");
    try {
      const result = await apiClient(endpoint);
      setPayload(result || {});
    } catch (err) {
      setError(err?.message || "Unable to load records from the server.");
      setPayload({});
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [endpoint]);

  const rows = useMemo(() => readArray(payload, recordsKeys), [payload, recordsKeys]);
  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => JSON.stringify(row || {}).toLowerCase().includes(q));
  }, [rows, query]);

  const computedKpis = useMemo(() => {
    const base = [{ label: "Records", value: rows.length, help: "Loaded from live database" }];
    return [...base, ...kpis.map((item) => ({ ...item, value: typeof item.value === "function" ? item.value(rows, payload) : item.value }))];
  }, [kpis, payload, rows]);

  return <div className="space-y-6">
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.35em] text-emerald-600">{eyebrow}</p>
      <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-950">{title}</h2>
          <p className="mt-2 max-w-4xl text-sm text-slate-600">{description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {endpoint ? <button onClick={load} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50">Refresh</button> : null}
          {createHint ? <span className="rounded-full bg-cyan-50 px-4 py-2 text-sm font-bold text-cyan-700">{createHint}</span> : null}
        </div>
      </div>
    </div>

    {error ? <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">{error}</div> : null}

    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {computedKpis.map((item) => <div key={item.label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
        <p className="mt-3 text-2xl font-black text-slate-950">{formatCell(item.value)}</p>
        <p className="mt-2 text-sm text-slate-500">{item.help}</p>
      </div>)}
    </div>

    {workflows.length ? <div className="grid gap-4 lg:grid-cols-3">{workflows.map((item) => <div key={item.title} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">{item.label || "Workflow"}</p><h3 className="mt-2 text-lg font-black text-slate-950">{item.title}</h3><p className="mt-2 text-sm text-slate-500">{item.description}</p></div>)}</div> : null}

    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div><h3 className="text-lg font-black text-slate-950">Live Records</h3><p className="text-xs text-slate-500">{filteredRows.length} shown from {rows.length} records</p></div>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search records..." className="w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-cyan-400 lg:w-80" />
      </div>
      {loading ? <div className="p-6 text-sm text-slate-500">Loading records…</div> : <div className="overflow-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{columns.map((column) => <th key={column.label} className="px-4 py-3">{column.label}</th>)}</tr></thead>
          <tbody>{filteredRows.map((row, index) => <tr key={row._id || row.id || index} className="border-t border-slate-100">{columns.map((column) => { const value = readValue(row, column.accessor); return <td key={column.label} className="px-4 py-3 align-middle text-slate-700">{column.status ? statusPill(value) : formatCell(value)}</td>; })}</tr>)}{!filteredRows.length ? <tr><td colSpan={columns.length || 1} className="px-4 py-10 text-center text-slate-400">{emptyText}</td></tr> : null}</tbody>
        </table>
      </div>}
    </div>
  </div>;
}
