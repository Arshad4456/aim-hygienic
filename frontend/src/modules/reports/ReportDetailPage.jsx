"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../app/lib/api";
import useCompanyScope from "../../../app/dashboards/admin/components/useCompanyScope";
import { buildPrintHtml, downloadJson, formatTimestamp } from "./reportsConfig";

function cn(...values) {
  return values.filter(Boolean).join(" ");
}

const PERIODS = [
  ["today", "Today"],
  ["this_week", "This week"],
  ["this_month", "This month"],
  ["quarter", "Quarter"],
  ["ytd", "YTD"],
];

export default function ReportDetailPage({ section = "overview", basePath = "/dashboards/admin/reports" }) {
  const { companies, companyDocId, setCompanyDocId, selectedCompany, canSelectCompany } = useCompanyScope();
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("this_month");

  const companyName = useMemo(() => selectedCompany?.name || selectedCompany?.companyName || "", [selectedCompany]);

  useEffect(() => {
    let active = true;
    async function load() {
      setErr("");
      try {
        const params = new URLSearchParams({ period });
        if (companyDocId) params.set("companyId", companyDocId);
        if (companyName) params.set("companyName", companyName);
        const res = await apiFetch(`/reports/detail/${section}?${params.toString()}`);
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
  }, [section, period, companyDocId, companyName]);

  function handleExportJson() {
    if (!data) return;
    downloadJson(`aim-report-${section}-${Date.now()}.json`, data);
  }

  function handlePrint() {
    if (!data || typeof window === "undefined") return;
    const html = buildPrintHtml({
      title: data.title,
      subtitle: data.subtitle,
      generatedAt: data.generatedAt,
      cards: data.cards || [],
      rows: data.rows || [],
      columns: data.columns || [],
      insights: data.insights || [],
    });
    const win = window.open("", "_blank", "width=1200,height=900");
    if (!win) return;
    win.document.open();
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 250);
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[32px] bg-[radial-gradient(circle_at_top_right,_rgba(99,102,241,0.22),_transparent_28%),linear-gradient(135deg,_#091122,_#16203a_46%,_#2d1f55_100%)] p-5 text-white shadow-2xl ring-1 ring-white/10 md:p-7">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_380px]">
          <div className="space-y-5">
            <Link href={basePath} className="inline-flex items-center rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15">
              ← Back to reports
            </Link>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-200">Detailed report</div>
              <h1 className="mt-3 text-balance text-3xl font-semibold leading-tight md:text-5xl">{data?.title || "Loading report…"}</h1>
              <p className="mt-3 max-w-4xl text-base leading-8 text-slate-200 md:text-xl md:leading-9">{data?.subtitle || "Professional, role-aware report detail."}</p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm text-slate-100/90">
              <MetaPill text={`Scope • ${data?.scopeLabel || 'Current business scope'}`} />
              <MetaPill text={`Role • ${data?.roleScope || 'admin'}`} />
              <MetaPill text={`Period • ${data?.periodLabel || 'This month'}`} />
              <MetaPill text={`Updated • ${formatTimestamp(data?.generatedAt)}`} />
            </div>
            <div className="flex flex-wrap gap-3">
              {PERIODS.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPeriod(value)}
                  className={cn(
                    "rounded-full border px-5 py-3 text-sm font-medium transition",
                    period === value ? "border-white bg-white text-slate-950" : "border-white/10 bg-white/10 text-white hover:bg-white/15",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            {canSelectCompany && companies.length ? (
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-200">Company scope</div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setCompanyDocId("")}
                    className={cn(
                      "rounded-full border px-4 py-2 text-sm transition",
                      !companyDocId ? "border-white bg-white text-slate-950" : "border-white/10 bg-white/10 text-white hover:bg-white/15",
                    )}
                  >
                    All companies
                  </button>
                  {companies.slice(0, 12).map((company) => {
                    const value = company._id || company.companyId;
                    const label = company.name || company.companyName || company.companyId || value;
                    const active = value === companyDocId;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setCompanyDocId(value)}
                        className={cn(
                          "rounded-full border px-4 py-2 text-sm transition",
                          active ? "border-sky-200 bg-sky-50 text-slate-950" : "border-white/10 bg-white/10 text-white hover:bg-white/15",
                        )}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/10 p-5 backdrop-blur">
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-300">Actions</div>
            <div className="mt-2 text-2xl font-semibold text-white">Export this report</div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={handleExportJson} className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-slate-100">Export JSON</button>
              <button type="button" onClick={handlePrint} className="rounded-2xl border border-white/10 bg-sky-400/20 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-400/30">Print detail</button>
            </div>
            <div className="mt-5 space-y-3">
              {(data?.relatedSections || []).slice(0, 4).map((item) => (
                <Link key={item.key} href={`${basePath}/${item.key}`} className="block rounded-2xl border border-white/10 bg-black/10 px-4 py-4 text-slate-100 hover:bg-black/20">
                  <div className="text-sm font-semibold">{item.title}</div>
                  <div className="mt-1 text-sm text-slate-300">{item.caption}</div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {err ? <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{err}</div> : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {(loading && !data ? Array.from({ length: 4 }) : data?.cards || []).map((card, idx) => (
          <div key={card?.label || idx} className="rounded-[26px] border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">{card?.label || 'Loading'}</div>
            <div className="mt-4 break-words text-3xl font-semibold text-zinc-950">{card?.value || '…'}</div>
            <div className="mt-3 text-sm leading-6 text-slate-500">{card?.helper || 'Please wait…'}</div>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-[30px] border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="text-3xl font-semibold text-zinc-950">Detailed table</div>
          <div className="mt-2 text-base text-slate-500">Structured, role-aware rows designed for real business review and export.</div>
          <div className="mt-5 overflow-hidden rounded-[24px] border border-zinc-200">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-zinc-50 text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                  <tr>
                    {(data?.columns || []).map((column) => (
                      <th key={column} className="px-4 py-4">{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(data?.rows || []).length ? (data.rows || []).map((row, rowIndex) => (
                    <tr key={`${section}-${rowIndex}`} className="border-t border-zinc-200 align-top text-zinc-700">
                      {row.map((cell, cellIndex) => (
                        <td key={`${rowIndex}-${cellIndex}`} className="px-4 py-4 break-words">{cell}</td>
                      ))}
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={(data?.columns || []).length || 1} className="px-4 py-12 text-center text-zinc-500">No rows available for this scope.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[30px] border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="text-2xl font-semibold text-zinc-950">Insights</div>
            <div className="mt-2 text-sm leading-6 text-slate-500">Summary observations to help management act faster.</div>
            <div className="mt-4 space-y-3">
              {(data?.insights || []).map((item, index) => (
                <div key={`${item}-${index}`} className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4 text-sm leading-6 text-zinc-700">{item}</div>
              ))}
              {!data?.insights?.length ? <div className="rounded-2xl border border-dashed border-zinc-300 px-4 py-5 text-sm text-zinc-500">No additional insight summary available.</div> : null}
            </div>
          </div>

          <div className="rounded-[30px] border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="text-2xl font-semibold text-zinc-950">Navigator</div>
            <div className="mt-2 text-sm leading-6 text-slate-500">Move through the professional reports module without losing context.</div>
            <div className="mt-4 space-y-3">
              {(data?.navigator || []).map((item) => (
                <Link
                  key={item.key}
                  href={`${basePath}/${item.key}`}
                  className={cn(
                    "block rounded-[22px] border px-4 py-4 transition",
                    item.key === section ? "border-sky-300 bg-sky-50 text-sky-700" : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-white",
                  )}
                >
                  <div className="text-base font-semibold">{item.title}</div>
                  <div className="mt-1 text-sm text-slate-500">{item.caption}</div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function MetaPill({ text }) {
  return <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-100">{text}</span>;
}
