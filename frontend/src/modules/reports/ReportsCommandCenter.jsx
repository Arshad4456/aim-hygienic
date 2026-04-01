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

export default function ReportsCommandCenter({ basePath = "/dashboards/admin/reports", isDistributor = false }) {
  const { companies, companyDocId, setCompanyDocId, selectedCompany, canSelectCompany } = useCompanyScope();
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("ytd");

  const companyName = useMemo(() => selectedCompany?.name || selectedCompany?.companyName || "", [selectedCompany]);

  useEffect(() => {
    let active = true;
    async function load() {
      setErr("");
      try {
        const params = new URLSearchParams({ period });
        if (companyDocId) params.set("companyId", companyDocId);
        if (companyName) params.set("companyName", companyName);
        const res = await apiFetch(`/reports/command-center?${params.toString()}`);
        if (!active) return;
        setData(res);
      } catch (error) {
        if (!active) return;
        setErr(error.message || "Failed to load reports command center");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [period, companyDocId, companyName]);

  function handleExportJson() {
    if (!data) return;
    downloadJson(`aim-reports-command-center-${Date.now()}.json`, data);
  }

  function handlePrint() {
    if (!data || typeof window === "undefined") return;
    const printable = buildPrintHtml({
      title: data.hero?.title || "Reports",
      subtitle: data.hero?.subtitle || "",
      generatedAt: data.generatedAt,
      cards: data.spotlight || [],
      rows: data.detailDefaults?.rows || [],
      columns: data.detailDefaults?.columns || [],
      insights: data.insights || [],
    });
    const win = window.open("", "_blank", "width=1200,height=900");
    if (!win) return;
    win.document.open();
    win.document.write(printable);
    win.document.close();
    setTimeout(() => win.print(), 250);
  }

  const spotlight = data?.spotlight || [];
  const navigator = data?.navigator || [];
  const alerts = data?.alerts || [];
  const leaderboards = data?.leaderboards || {};
  const sectionsPreview = data?.sectionsPreview || [];
  const recentActivity = data?.recentActivity || [];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[32px] bg-[radial-gradient(circle_at_top_right,_rgba(125,211,252,0.25),_transparent_30%),linear-gradient(135deg,_#081123,_#16203f_48%,_#2f1d53_100%)] p-5 text-white shadow-2xl ring-1 ring-white/10 md:p-7">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_400px]">
          <div className="space-y-5">
            <div className="inline-flex items-center rounded-full border border-white/10 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-100">
              AIM ERP • Reports intelligence
            </div>
            <div className="space-y-3">
              <h1 className="max-w-4xl text-balance text-3xl font-semibold leading-tight md:text-5xl">
                {data?.hero?.title || "Professional reports command center"}
              </h1>
              <p className="max-w-4xl text-base leading-8 text-slate-200 md:text-xl md:leading-9">
                {data?.hero?.subtitle || "Professional reporting for real business decision-making."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm text-slate-100/90">
              <MetaPill text={`Scope • ${data?.scopeLabel || "Current business scope"}`} />
              <MetaPill text={`Role • ${data?.roleScope || (isDistributor ? "distributor" : "admin")}`} />
              <MetaPill text={`Period • ${data?.periodLabel || "This month"}`} />
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

          <div className="space-y-4">
            <div className="rounded-[28px] border border-white/10 bg-white/10 p-5 backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-300">Actions</div>
                  <div className="mt-2 text-2xl font-semibold text-white">Management tools</div>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-white/10" />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button type="button" onClick={handleExportJson} className="rounded-2xl border border-white/10 bg-white px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-slate-100">Export JSON</button>
                <button type="button" onClick={handlePrint} className="rounded-2xl border border-white/10 bg-sky-400/20 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-400/30">Print summary</button>
              </div>
              <div className="mt-5 space-y-2">
                {(data?.teamCounts || []).slice(0, 8).map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-slate-100">
                    <span>{item.label}</span>
                    <span className="font-semibold">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {err ? <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{err}</div> : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {(loading && !data ? Array.from({ length: 8 }) : spotlight).map((card, idx) => (
          <div key={card?.key || idx} className="rounded-[26px] border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">{card?.label || "Loading"}</div>
            <div className="mt-4 break-words text-3xl font-semibold text-zinc-950">{card?.value || "…"}</div>
            <div className="mt-3 text-sm leading-6 text-slate-500">{card?.helper || "Please wait…"}</div>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-[30px] border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-3xl font-semibold text-zinc-950">Reports navigator</div>
              <div className="mt-2 text-base text-slate-500">Open the exact business reporting surface you need. Each section is scoped by role and company / territory context.</div>
            </div>
            <div className="hidden rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm text-zinc-600 md:block">
              {navigator.length} sections
            </div>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {navigator.map((item, index) => (
              <Link key={item.key} href={`${basePath}/${item.key}`} className="group rounded-[24px] border border-zinc-200 bg-zinc-50 p-5 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md">
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">{String(index + 1).padStart(2, "0")}</span>
                  <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">{item.audience === "admin" ? "Admin" : "Business"}</span>
                </div>
                <div className="mt-4 text-xl font-semibold text-zinc-950 group-hover:text-sky-700">{item.title}</div>
                <div className="mt-2 text-sm leading-6 text-slate-500">{item.caption}</div>
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[30px] border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="text-2xl font-semibold text-zinc-950">Management insights</div>
            <div className="mt-2 text-sm leading-6 text-slate-500">Quick conclusions the company can act on immediately.</div>
            <div className="mt-4 space-y-3">
              {(data?.insights || []).map((item, index) => (
                <div key={`${item}-${index}`} className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4 text-sm leading-6 text-zinc-700">{item}</div>
              ))}
              {!data?.insights?.length ? <div className="rounded-2xl border border-dashed border-zinc-300 px-4 py-5 text-sm text-zinc-500">No insight summary available.</div> : null}
            </div>
          </div>

          <div className="rounded-[30px] border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="text-2xl font-semibold text-zinc-950">Critical watchlist</div>
            <div className="mt-2 text-sm leading-6 text-slate-500">Low stock, overdue, delivery, and return issues that need action.</div>
            <div className="mt-4 space-y-3">
              {alerts.length ? alerts.map((item, index) => (
                <div key={`${item.title}-${index}`} className={cn("rounded-2xl border px-4 py-4", item.severity === "critical" ? "border-rose-200 bg-rose-50" : item.severity === "warning" ? "border-amber-200 bg-amber-50" : "border-sky-200 bg-sky-50") }>
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-zinc-950">{item.title}</div>
                    <div className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-600">{item.severity}</div>
                  </div>
                  <div className="mt-2 text-sm leading-6 text-zinc-600">{item.description}</div>
                  <div className="mt-3 text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">{item.meta}</div>
                </div>
              )) : <div className="rounded-2xl border border-dashed border-zinc-300 px-4 py-5 text-sm text-zinc-500">No watchlist items found.</div>}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,380px)]">
        <div className="rounded-[30px] border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="text-3xl font-semibold text-zinc-950">Business highlights</div>
          <div className="mt-2 text-base text-slate-500">Professional snapshot cards for revenue, stock, recovery, delivery, returns, and expense control.</div>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sectionsPreview.map((item) => (
              <div key={item.key} className="rounded-[24px] border border-zinc-200 bg-zinc-50 p-5">
                <div className="text-lg font-semibold text-zinc-950">{item.title}</div>
                <div className="mt-3 space-y-2">
                  {item.points.map((point) => (
                    <div key={point} className="text-sm leading-6 text-slate-600">• {point}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[30px] border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="text-2xl font-semibold text-zinc-950">Recent activity</div>
          <div className="mt-2 text-sm leading-6 text-slate-500">Latest order, receipt, and expense signals visible inside this scope.</div>
          <div className="mt-4 space-y-3">
            {recentActivity.length ? recentActivity.map((item) => (
              <div key={item.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4">
                <div className="text-sm font-semibold text-zinc-950">{item.title}</div>
                <div className="mt-1 text-sm text-slate-600">{item.meta}</div>
                <div className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">{formatTimestamp(item.at)}</div>
              </div>
            )) : <div className="rounded-2xl border border-dashed border-zinc-300 px-4 py-5 text-sm text-zinc-500">No recent activity found.</div>}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        {[
          ["Top territories", leaderboards.territories || []],
          ["Top customers", leaderboards.customers || []],
          ...(isDistributor ? [] : [["Top distributors", leaderboards.distributors || []]]),
          ["Top suppliers", leaderboards.suppliers || []],
        ].map(([title, rows]) => (
          <div key={title} className="rounded-[30px] border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="text-2xl font-semibold text-zinc-950">{title}</div>
            <div className="mt-4 overflow-hidden rounded-[24px] border border-zinc-200">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-zinc-50 text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                    <tr>
                      <th className="px-4 py-4">Name</th>
                      <th className="px-4 py-4">Revenue</th>
                      <th className="px-4 py-4">Orders</th>
                      <th className="px-4 py-4">Customers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length ? rows.map((row) => (
                      <tr key={`${title}-${row.label}`} className="border-t border-zinc-200 text-zinc-700">
                        <td className="px-4 py-4 font-medium text-zinc-950">{row.label}</td>
                        <td className="px-4 py-4">{typeof row.amount === 'number' ? new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(row.amount) : row.amount}</td>
                        <td className="px-4 py-4">{row.orders}</td>
                        <td className="px-4 py-4">{row.customers}</td>
                      </tr>
                    )) : <tr><td colSpan={4} className="px-4 py-8 text-center text-zinc-500">No data available.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

function MetaPill({ text }) {
  return <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-100">{text}</span>;
}