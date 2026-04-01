"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../app/lib/api";
import { getAuthItem } from "../../../app/lib/clientAuth";
import { buildPrintHtml, downloadJson, formatTimestamp } from "./reportsConfig";

function cn(...values) {
  return values.filter(Boolean).join(" ");
}

export default function ReportsCommandCenter({ basePath = "/dashboards/admin/reports", isDistributor = false }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("this_month");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedNavigator, setSelectedNavigator] = useState("overview");
  const [selectedTable, setSelectedTable] = useState("topTerritories");

  const authUser = useMemo(() => {
    try {
      const raw = getAuthItem("aim_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  async function loadData() {
    setErr("");
    try {
      const query = new URLSearchParams({ period }).toString();
      const res = await apiFetch(`/reports/command-center?${query}`);
      setData(res);
    } catch (error) {
      setErr(error.message || "Failed to load reports command center");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [period]);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const timer = setInterval(loadData, 45000);
    return () => clearInterval(timer);
  }, [autoRefresh, period]);

  useEffect(() => {
    if (!data?.navigator?.some((item) => item.key === selectedNavigator)) {
      setSelectedNavigator(data?.navigator?.[0]?.key || "overview");
    }
  }, [data, selectedNavigator]);

  const spotlight = data?.spotlight || [];
  const pulseCards = data?.hero?.pulseCards || [];
  const navigator = data?.navigator || [];
  const topRowsMap = {
    topTerritories: data?.performance?.topTerritories || [],
    topCustomers: data?.performance?.topCustomers || [],
    distributors: data?.performance?.distributors || [],
    teamByRole: data?.performance?.teamByRole || [],
  };
  const topRows = topRowsMap[selectedTable] || [];

  function handleExportJson() {
    if (!data) return;
    downloadJson(`aim-reports-${Date.now()}.json`, data);
  }

  function handlePrint() {
    if (!data || typeof window === "undefined") return;
    const printable = buildPrintHtml({
      title: data.hero?.title || "Reports",
      subtitle: data.hero?.subtitle || "",
      generatedAt: data.generatedAt,
      cards: spotlight.slice(0, 6),
      columns: ["Title", "Caption", "Route"],
      rows: navigator.map((item) => [item.title, item.caption, item.href]),
    });
    const win = window.open("", "_blank", "width=1100,height=900");
    if (!win) return;
    win.document.open();
    win.document.write(printable);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 250);
  }

  return (
    <div className="space-y-6 print:space-y-3">
      <section className="overflow-hidden rounded-[32px] bg-[radial-gradient(circle_at_top_right,_rgba(56,189,248,0.25),_transparent_26%),linear-gradient(135deg,_#070c18,_#14204d_50%,_#351e66_100%)] p-4 text-white shadow-2xl ring-1 ring-white/10 md:p-6 print:rounded-none print:bg-white print:text-zinc-900 print:shadow-none print:ring-0">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(340px,430px)]">
          <div className="min-w-0 space-y-4">
            <div className="inline-flex items-center rounded-full border border-white/10 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-zinc-200">
              AIM ERP • Reports Intelligence
            </div>
            <div className="space-y-3">
              <h1 className="max-w-4xl text-balance text-3xl font-semibold leading-tight md:text-5xl">
                {data?.hero?.title || "Enterprise reporting command center"}
              </h1>
              <p className="max-w-3xl text-base leading-8 text-slate-200 md:text-2xl md:leading-10 print:text-zinc-600">
                {data?.hero?.subtitle || "Monitor performance from one premium control surface."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-sm text-zinc-200 print:text-zinc-600">
              <Badge>Scope • {data?.scopeLabel || authUser?.companyName || "AIM Hygienic"}</Badge>
              <Badge>Role • {data?.roleScope || authUser?.role || "admin"}</Badge>
              <Badge>Updated • {formatTimestamp(data?.generatedAt)}</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-3 print:hidden">
              {[
                ["today", "Today"],
                ["this_week", "This week"],
                ["this_month", "This month"],
                ["quarter", "Quarter"],
                ["ytd", "Year to date"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPeriod(value)}
                  className={cn(
                    "rounded-full border px-5 py-3 text-base transition",
                    period === value ? "border-white bg-white text-zinc-900" : "border-white/15 bg-white/10 text-white hover:bg-white/15",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-3 print:hidden">
              <button type="button" onClick={() => setAutoRefresh((v) => !v)} className="rounded-full border border-white/10 bg-white/10 px-5 py-3 text-base font-medium text-white hover:bg-white/15">
                Auto refresh • {autoRefresh ? "On" : "Off"}
              </button>
              <button type="button" onClick={loadData} className="rounded-full border border-sky-400/40 bg-sky-500/20 px-5 py-3 text-base font-medium text-sky-50 hover:bg-sky-500/30">
                Refresh now
              </button>
              <button type="button" onClick={handleExportJson} className="rounded-full border border-emerald-400/35 bg-emerald-500/15 px-5 py-3 text-base font-medium text-emerald-50 hover:bg-emerald-500/25">
                Export JSON
              </button>
              <button type="button" onClick={handlePrint} className="rounded-full border border-fuchsia-300/30 bg-fuchsia-400/15 px-5 py-3 text-base font-medium text-fuchsia-50 hover:bg-fuchsia-400/25">
                Print view
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1 xl:gap-4 print:hidden">
            {pulseCards.map((card) => (
              <div key={card.label} className="min-w-0 overflow-hidden rounded-[28px] border border-white/10 bg-white/10 px-5 py-6 backdrop-blur-sm">
                <div className="text-xs uppercase tracking-[0.28em] text-zinc-300">{card.label}</div>
                <div className="mt-5 break-words text-3xl font-semibold leading-none md:text-4xl">{card.value}</div>
                <div className="mt-4 text-base leading-6 text-zinc-200">{card.helper}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {err ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{err}</div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 print:grid-cols-2">
        {loading && !data ? Array.from({ length: 8 }).map((_, idx) => <SkeletonCard key={idx} />) : spotlight.map((card, idx) => (
          <article key={card.key || card.label} className="min-w-0 rounded-[26px] border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg print:break-inside-avoid">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">{card.label}</div>
                <div className="mt-4 break-words text-3xl font-semibold text-zinc-950 md:text-4xl">{card.value}</div>
              </div>
              <div className={cn("h-3 w-3 rounded-full", idx === 1 ? "bg-rose-500" : idx === 2 ? "bg-sky-500" : idx === 3 ? "bg-amber-500" : "bg-zinc-400")} />
            </div>
            <div className="mt-4 text-sm leading-6 text-zinc-500">{card.helper}</div>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_380px] print:grid-cols-1">
        <article className="rounded-[30px] border border-zinc-200 bg-white p-6 shadow-sm print:break-inside-avoid">
          <div className="text-4xl font-semibold text-zinc-950">Navigator</div>
          <p className="mt-3 text-lg leading-8 text-slate-500">Jump into the most used reporting lenses.</p>
          <div className="mt-6 space-y-4">
            {navigator.map((item, idx) => (
              <Link
                key={item.key}
                href={item.href || `${basePath}/${item.key}`}
                onMouseEnter={() => setSelectedNavigator(item.key)}
                className={cn(
                  "flex items-center justify-between gap-4 rounded-[26px] border p-5 transition",
                  selectedNavigator === item.key ? "border-indigo-300 bg-indigo-50 shadow-md" : "border-zinc-200 bg-zinc-50 hover:border-zinc-300 hover:bg-white",
                )}
              >
                <div className="min-w-0">
                  <div className="text-2xl font-semibold text-zinc-950">{item.title}</div>
                  <div className="mt-2 text-lg leading-8 text-slate-500">{item.caption}</div>
                </div>
                <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-[#0c1433] text-2xl font-semibold text-white">{String(idx + 1).padStart(2, "0")}</div>
              </Link>
            ))}
          </div>
        </article>

        <div className="min-w-0 space-y-6">
          <article className="rounded-[30px] border border-zinc-200 bg-white p-6 shadow-sm print:break-inside-avoid">
            <div className="grid gap-6 lg:grid-cols-[minmax(220px,240px)_minmax(0,1fr)]">
              <div className="min-w-0 rounded-[36px] bg-[#030a2a] p-6 text-white shadow-xl">
                <div className="text-3xl font-semibold leading-tight">Sales trend</div>
                <div className="mt-3 text-xl leading-9 text-white/75">
                  Period • {data?.salesBoard?.currentPeriodLabel || "This month"}
                </div>
                <div className="mt-4 inline-flex rounded-full border border-white/10 bg-white/10 px-4 py-2 text-2xl">{data?.salesBoard?.trendValue || "0"}</div>
                <div className="mt-8 grid grid-cols-2 gap-3">
                  {(data?.salesBoard?.trendBars || []).map((bar) => (
                    <div key={bar.label} className="rounded-[28px] bg-white/5 p-4">
                      <div className="text-sm uppercase tracking-[0.2em] text-white/50">{bar.label}</div>
                      <div className="mt-3 h-40 rounded-[28px] bg-gradient-to-t from-cyan-500 via-sky-400 to-violet-400" style={{ clipPath: `inset(${Math.max(0, 100 - Math.min(100, (Number(bar.value || 0) / Math.max(1, Number(data?.salesBoard?.trendBars?.[1]?.value || 1))) * 100))}% 0 0 0 round 28px)` }} />
                      <div className="mt-3 text-2xl">{Number(bar.value || 0).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="min-w-0 space-y-4">
                <div>
                  <div className="text-4xl font-semibold text-zinc-950">{data?.salesBoard?.trendTitle || "Revenue and execution mix"}</div>
                  <div className="mt-3 text-lg leading-8 text-slate-500">{data?.salesBoard?.trendSubtitle}</div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {(data?.salesBoard?.statusMix || []).map((item) => (
                    <div key={item.label} className="rounded-[24px] border border-zinc-200 bg-zinc-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-2xl font-semibold text-zinc-900">{item.label}</div>
                        <div className="text-2xl font-semibold text-zinc-950">{item.count}</div>
                      </div>
                      <div className="mt-4 h-3 overflow-hidden rounded-full bg-zinc-200">
                        <div className="h-full rounded-full bg-[linear-gradient(90deg,#22d3ee,#8b5cf6,#d946ef)]" style={{ width: `${Math.max(10, Math.min(100, (Number(item.count || 0) / Math.max(1, ...((data?.salesBoard?.statusMix || []).map((s) => Number(s.count || 0))))) * 100))}%` }} />
                      </div>
                      <div className="mt-3 text-lg text-slate-500">{Number(item.amount || 0).toLocaleString('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 })}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </article>

          <article className="rounded-[30px] border border-zinc-200 bg-white p-6 shadow-sm print:break-inside-avoid">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-4xl font-semibold text-zinc-950">{data?.performance?.title || 'Area and customer performance'}</div>
                <div className="mt-3 text-lg leading-8 text-slate-500">{data?.performance?.subtitle}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <SectionPill label="Territories" active={selectedTable === 'topTerritories'} onClick={() => setSelectedTable('topTerritories')} />
                <SectionPill label="Customers" active={selectedTable === 'topCustomers'} onClick={() => setSelectedTable('topCustomers')} />
                {!isDistributor ? <SectionPill label="Distributors" active={selectedTable === 'distributors'} onClick={() => setSelectedTable('distributors')} /> : null}
                <SectionPill label="Team" active={selectedTable === 'teamByRole'} onClick={() => setSelectedTable('teamByRole')} />
              </div>
            </div>
            <div className="mt-5 overflow-hidden rounded-[24px] border border-zinc-200">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                  <thead className="bg-zinc-50 text-sm uppercase tracking-[0.18em] text-slate-500">
                    <tr>
                      <th className="px-4 py-4">Name</th>
                      <th className="px-4 py-4">Value</th>
                      <th className="px-4 py-4">Context</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topRows.length ? topRows.map((item) => (
                      <tr key={`${selectedTable}-${item.label}`} className="border-t border-zinc-200 bg-white align-top text-base text-zinc-700">
                        <td className="px-4 py-4 font-semibold text-zinc-900">{item.label}</td>
                        <td className="px-4 py-4 whitespace-nowrap">{item.value}</td>
                        <td className="px-4 py-4 break-words text-slate-500">{item.helper}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={3} className="px-4 py-10 text-center text-base text-slate-500">No rows available in this scope.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </article>
        </div>

        <div className="min-w-0 space-y-6">
          <article className="rounded-[30px] border border-zinc-200 bg-white p-6 shadow-sm print:break-inside-avoid">
            <div className="text-4xl font-semibold text-zinc-950">{data?.riskBoard?.title || 'Critical watchlist'}</div>
            <div className="mt-3 text-lg leading-8 text-slate-500">{data?.riskBoard?.subtitle}</div>
            <div className="mt-5 space-y-4">
              {(data?.riskBoard?.rows || []).map((row) => (
                <Link key={`${row.title}-${row.meta}`} href={`${basePath}/${row.href || 'exceptions'}`} className={cn(
                  'block rounded-[28px] border p-5 transition hover:-translate-y-0.5',
                  row.severity === 'critical' ? 'border-rose-200 bg-rose-50' : 'border-amber-200 bg-amber-50',
                )}>
                  <div className="flex items-start gap-4">
                    <div className={cn('mt-1 h-5 w-5 shrink-0 rounded-full', row.severity === 'critical' ? 'bg-rose-500' : 'bg-amber-500')} />
                    <div className="min-w-0">
                      <div className="inline-flex rounded-full bg-white/50 px-3 py-1 text-sm font-semibold capitalize text-zinc-700">{row.severity}</div>
                      <div className="mt-4 break-words text-2xl font-semibold leading-9 text-zinc-900">{row.title}</div>
                      <div className="mt-3 text-lg leading-8 text-slate-500">{row.description}</div>
                      <div className="mt-4 break-all text-base uppercase tracking-[0.18em] text-slate-400">{formatTimestamp(row.meta)}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </article>

          <article className="rounded-[30px] border border-zinc-200 bg-white p-6 shadow-sm print:break-inside-avoid">
            <div className="text-4xl font-semibold text-zinc-950">{data?.portfolio?.title || 'Inventory, recovery, and portfolio mix'}</div>
            <div className="mt-3 text-lg leading-8 text-slate-500">{data?.portfolio?.subtitle}</div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {(data?.portfolio?.stats || []).map((stat) => (
                <div key={stat.label} className="rounded-[24px] border border-zinc-200 bg-zinc-50 p-4">
                  <div className="text-sm uppercase tracking-[0.25em] text-slate-500">{stat.label}</div>
                  <div className="mt-4 break-words text-3xl font-semibold text-zinc-950">{stat.value}</div>
                  <div className="mt-3 text-base leading-7 text-slate-500">{stat.helper}</div>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-[24px] bg-[#07102d] p-5 text-white">
              <div className="text-sm uppercase tracking-[0.2em] text-sky-200">Low stock watch</div>
              <div className="mt-4 space-y-4">
                {(data?.portfolio?.lowStockRows || []).map((item) => (
                  <div key={item.productId} className="rounded-[20px] border border-white/10 bg-white/5 p-4">
                    <div className="text-2xl font-semibold">{item.productName}</div>
                    <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-cyan-400" style={{ width: `${Math.max(10, Math.min(100, ((Number(item.onHand || 0) + 1) / Math.max(1, Number(item.minStockLevel || 1))) * 100))}%` }} />
                    </div>
                    <div className="mt-3 text-base text-white/70">On hand {item.onHand} • minimum {item.minStockLevel}</div>
                  </div>
                ))}
                {!data?.portfolio?.lowStockRows?.length ? <div className="rounded-[20px] border border-white/10 bg-white/5 p-4 text-base text-white/70">No low stock exceptions found.</div> : null}
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="rounded-[30px] border border-zinc-200 bg-white p-6 shadow-sm print:break-inside-avoid">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-4xl font-semibold text-zinc-950">Team and account roster</div>
            <div className="mt-3 text-lg leading-8 text-slate-500">
              {isDistributor ? 'Salesmen, order bookers, and territory customers in assigned scope.' : 'All available user roles, territory ownership, and active accounts in current company scope.'}
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <MiniCount label="Active users" value={data?.roster?.counts?.activeUsers} />
            <MiniCount label="Customers" value={data?.roster?.counts?.customers} />
            <MiniCount label="Salesmen" value={data?.roster?.counts?.salesmen} />
            <MiniCount label="Order bookers" value={data?.roster?.counts?.orderBookers} />
            {!isDistributor ? <MiniCount label="Suppliers" value={data?.roster?.counts?.suppliers} /> : null}
          </div>
        </div>
        <div className="mt-5 overflow-hidden rounded-[24px] border border-zinc-200">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-zinc-50 text-sm uppercase tracking-[0.18em] text-slate-500">
                <tr>
                  <th className="px-4 py-4">Name</th>
                  <th className="px-4 py-4">Role</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4">Territory</th>
                  <th className="px-4 py-4">Field</th>
                </tr>
              </thead>
              <tbody>
                {(data?.roster?.users || []).length ? data.roster.users.map((user) => (
                  <tr key={`${user.name}-${user.role}-${user.territoryName}`} className="border-t border-zinc-200 align-top text-base text-zinc-700">
                    <td className="px-4 py-4 font-semibold text-zinc-900">{user.name}</td>
                    <td className="px-4 py-4">{user.role}</td>
                    <td className="px-4 py-4 capitalize">{user.status}</td>
                    <td className="px-4 py-4">{user.territoryName}</td>
                    <td className="px-4 py-4">{user.fieldName}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-base text-slate-500">No team members or accounts found in this reporting scope.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

function Badge({ children }) {
  return <span className="rounded-full border border-white/10 bg-white/10 px-4 py-2">{children}</span>;
}

function SectionPill({ label, active, onClick }) {
  return (
    <button type="button" onClick={onClick} className={cn("rounded-full border px-4 py-2 text-sm font-medium", active ? "border-indigo-200 bg-indigo-50 text-indigo-700" : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-white")}>{label}</button>
  );
}

function SkeletonCard() {
  return <div className="h-40 animate-pulse rounded-[26px] border border-zinc-200 bg-zinc-100" />;
}

function MiniCount({ label, value }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-center">
      <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-zinc-950">{Number(value || 0).toLocaleString()}</div>
    </div>
  );
}