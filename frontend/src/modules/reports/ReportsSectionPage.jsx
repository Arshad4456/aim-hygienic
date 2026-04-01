"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../../app/lib/api";
import { SECTION_META, formatValue } from "./utils";

function MetricCard({ label, value, format }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-zinc-900">{formatValue(value, format)}</div>
    </div>
  );
}

function TableBlock({ title, columns, rows }) {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="text-base font-semibold text-zinc-900">{title}</div>
      <div className="mt-4 overflow-auto rounded-2xl border border-zinc-200">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-50">
            <tr>
              {columns.map((column) => (
                <th key={column} className="border-b border-zinc-200 px-3 py-2 text-left font-medium text-zinc-600">{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length ? rows.map((row, index) => (
              <tr key={`${title}-${index}`} className="hover:bg-zinc-50">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="border-b border-zinc-100 px-3 py-2 text-zinc-700">{cell}</td>
                ))}
              </tr>
            )) : (
              <tr>
                <td colSpan={columns.length || 1} className="px-3 py-8 text-center text-zinc-500">No rows available.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ReportsSectionPage({ sectionKey, companyId = "", companyName = "" }) {
  const meta = SECTION_META[sectionKey];
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const query = new URLSearchParams();
        if (companyId) query.set("companyId", companyId);
        if (companyName) query.set("companyName", companyName);
        const suffix = query.toString() ? `?${query.toString()}` : "";
        if (Array.isArray(meta.endpoints) && meta.endpoints.length) {
          const sections = await Promise.all(meta.endpoints.map((endpoint) => apiFetch(`${endpoint}${suffix}`)));
          if (!mounted) return;
          setReport({ sections });
        } else {
          const data = await apiFetch(`${meta.endpoint}${suffix}`);
          if (!mounted) return;
          setReport(data);
        }
      } catch (e) {
        if (!mounted) return;
        setError(e.message || `Failed to load ${meta.title}`);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [meta.endpoint, meta.endpoints, meta.title, companyId, companyName]);

  const metrics = meta.metrics(report || {});

  return (
    <div className="space-y-5">
      <div className="rounded-[28px] border border-zinc-200 bg-gradient-to-br from-zinc-900 via-zinc-900 to-emerald-950 p-6 text-white shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-200/80">Detailed report</div>
        <div className="mt-3 text-3xl font-semibold tracking-tight">{meta.title}</div>
        <div className="mt-3 max-w-3xl text-sm text-zinc-300">{meta.subtitle}</div>
      </div>

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((item) => <MetricCard key={item.label} {...item} />)}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        {meta.panels.map((panel) => (
          <TableBlock
            key={panel.key}
            title={panel.title}
            columns={typeof panel.columns === "function" ? panel.columns(report || {}) : panel.columns}
            rows={panel.rows(report || {})}
          />
        ))}
      </div>

      {loading ? <div className="text-sm text-zinc-500">Loading report…</div> : null}
    </div>
  );
}
