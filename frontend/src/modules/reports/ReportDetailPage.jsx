"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../app/lib/api";
import { buildPrintHtml, downloadJson, formatTimestamp } from "./reportsConfig";

function cn(...values) {
  return values.filter(Boolean).join(" ");
}

export default function ReportDetailPage({ section = "overview", basePath = "/dashboards/admin/reports" }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      setErr("");
      try {
        const res = await apiFetch(`/reports/detail/${section}`);
        if (!active) return;
        setData(res);
      } catch (error) {
        if (!active) return;
        setErr(error.message || "Failed to load report detail");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [section]);

  const rows = data?.rows || [];
  const columns = data?.columns || [];
  const cards = data?.cards || [];

  function handleExportJson() {
    if (!data) return;
    downloadJson(`aim-report-${section}.json`, data);
  }

  function handlePrint() {
    if (!data || typeof window === "undefined") return;
    const html = buildPrintHtml({
      title: data.title,
      subtitle: data.subtitle,
      generatedAt: data.generatedAt,
      cards,
      rows,
      columns,
    });
    const win = window.open("", "_blank", "width=1100,height=900");
    if (!win) return;
    win.document.open();
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 250);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href={basePath} className="text-sm font-medium text-emerald-700 hover:text-emerald-800">← Back to reports</Link>
            <div className="mt-3 text-4xl font-semibold text-zinc-950">{data?.title || "Report detail"}</div>
            <div className="mt-3 max-w-4xl text-lg leading-8 text-slate-500">{data?.subtitle || "Detailed report breakdown."}</div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={handleExportJson} className="rounded-full border border-zinc-200 bg-zinc-50 px-5 py-3 text-sm font-medium text-zinc-700 hover:bg-white">Export JSON</button>
            <button type="button" onClick={handlePrint} className="rounded-full border border-indigo-200 bg-indigo-50 px-5 py-3 text-sm font-medium text-indigo-700 hover:bg-indigo-100">Print</button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-sm text-zinc-500">
          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1">Scope • {data?.scopeLabel || "AIM Hygienic"}</span>
          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1">Role • {data?.roleScope || "admin"}</span>
          <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1">Updated • {formatTimestamp(data?.generatedAt)}</span>
        </div>
      </div>

      {err ? <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{err}</div> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {(loading && !data ? Array.from({ length: 4 }).map((_, idx) => ({ key: idx, label: "Loading", value: "...", helper: "" })) : cards).map((card, idx) => (
          <div key={card.label || idx} className="rounded-[24px] border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">{card.label}</div>
            <div className="mt-4 break-words text-3xl font-semibold text-zinc-950">{card.value}</div>
            <div className="mt-3 text-sm leading-6 text-slate-500">{card.helper}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="text-3xl font-semibold text-zinc-950">Detailed table</div>
          <div className="mt-2 text-base text-slate-500">Role-aware breakdown for this reporting section.</div>
          <div className="mt-5 overflow-hidden rounded-[22px] border border-zinc-200">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead className="bg-zinc-50 text-xs uppercase tracking-[0.18em] text-slate-500">
                  <tr>
                    {columns.map((column) => <th key={column} className="px-4 py-4">{column}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.length ? rows.map((row, rowIndex) => (
                    <tr key={`${section}-${rowIndex}`} className="border-t border-zinc-200 align-top text-sm text-zinc-700">
                      {row.map((cell, cellIndex) => <td key={`${rowIndex}-${cellIndex}`} className="px-4 py-4 break-words">{cell}</td>)}
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={columns.length || 1} className="px-4 py-12 text-center text-sm text-slate-500">No rows available for this view.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-2xl font-semibold text-zinc-950">Navigator</div>
            <div className="mt-2 text-sm leading-6 text-slate-500">Move between detailed reporting modules.</div>
            <div className="mt-4 space-y-3">
              {(data?.navigator || []).map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  className={cn(
                    "block rounded-[20px] border px-4 py-4 transition",
                    item.key === section ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-white",
                  )}
                >
                  <div className="text-base font-semibold">{item.title}</div>
                  <div className="mt-1 text-sm text-slate-500">{item.caption}</div>
                </Link>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}