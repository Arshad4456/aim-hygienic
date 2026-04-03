"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "../../../lib/api";

const PERIODS = [
  { key: "all", label: "All" },
  { key: "day", label: "Day" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "quarter", label: "Quarter" },
  { key: "year", label: "Year" },
];

const toneMap = {
  indigo: "from-indigo-600 via-violet-600 to-sky-500",
  fuchsia: "from-fuchsia-600 via-pink-600 to-rose-500",
  violet: "from-violet-600 via-purple-600 to-indigo-500",
  blue: "from-blue-600 via-cyan-600 to-sky-500",
  sky: "from-sky-600 via-cyan-500 to-blue-500",
  emerald: "from-emerald-600 via-teal-500 to-cyan-500",
  amber: "from-amber-500 via-orange-500 to-rose-500",
  cyan: "from-cyan-600 via-sky-500 to-blue-500",
  rose: "from-rose-600 via-pink-500 to-orange-500",
  orange: "from-orange-500 via-amber-500 to-yellow-400",
  teal: "from-teal-600 via-emerald-500 to-cyan-500",
  pink: "from-pink-600 via-rose-500 to-orange-500",
  slate: "from-slate-700 via-slate-600 to-indigo-500",
  red: "from-red-600 via-rose-500 to-orange-500",
  purple: "from-purple-600 via-fuchsia-500 to-pink-500",
  lime: "from-lime-500 via-emerald-500 to-teal-500",
  yellow: "from-yellow-500 via-amber-500 to-orange-500",
};

export function ReportsMasterView({ basePath, roleLabel }) {
  const [period, setPeriod] = useState("month");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    apiFetch(`/reports/master?period=${period}`)
      .then((response) => {
        if (!cancelled) {
          setData(response);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Failed to load reports");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [period]);

  const summary = data?.summary || {};
  const modules = Array.isArray(data?.modules) ? data.modules : [];

  return (
    <div className="space-y-6">
      <ReportsHero
        roleLabel={roleLabel}
        meta={data?.meta}
        period={period}
        setPeriod={setPeriod}
        headlineKpis={summary.headlineKpis || []}
        alerts={summary.alerts || []}
        insights={summary.insights || []}
      />

      {error ? <ErrorBanner message={error} /> : null}
      {loading ? <LoadingBlock /> : null}

      {!loading && !error ? (
        <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-slate-900">KPI cards by module</div>
                <div className="mt-1 text-sm text-slate-500">
                  Every card maps to a sidebar business module and opens its focused report view.
                </div>
              </div>
              <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {modules.length} modules
              </div>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {(summary.cards || []).map((card) => (
                <Link
                  key={card.key}
                  href={`${basePath}/${card.routeSegment || card.key}`}
                  className="group relative overflow-hidden rounded-[26px] border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500" />
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 break-words">{card.title}</div>
                      <div className="mt-1 text-xs text-slate-500 break-words">{card.description}</div>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                      {card.alertCount} alerts
                    </span>
                  </div>
                  <div className="mt-4 rounded-2xl bg-slate-950/95 p-4 text-white">
                    <div className="text-[11px] uppercase tracking-[0.2em] text-slate-300">{card.primaryMetric?.label || "Metric"}</div>
                    <div className="mt-2 break-words text-2xl font-semibold">{card.primaryMetric?.value || "—"}</div>
                    <div className="mt-2 text-xs text-slate-300">{card.primaryMetric?.note || card.badge}</div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-600">{card.badge}</span>
                    <span className={`font-semibold ${toneClass(card.comparison?.tone)}`}>{card.comparison?.deltaText || "0.0%"}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-lg font-semibold text-slate-900">Performance compare</div>
            <div className="mt-1 text-sm text-slate-500">
              Current period versus previous period on company-wide order, expense, and loan movement.
            </div>
            <div className="mt-4 grid gap-3">
              <CompareCard title="Orders" block={summary.orderComparison} />
              <CompareCard title="Expenses" block={summary.expenseComparison} currency />
              <CompareCard title="Given Loans" block={summary.givenLoanComparison} currency />
              <CompareCard title="Received Loans" block={summary.receivedLoanComparison} currency />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ReportFocusView({ moduleKey, basePath }) {
  const params = useParams();
  const resolvedModuleKey = useMemo(() => {
    const raw = moduleKey || params?.moduleKey;
    return typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : "";
  }, [moduleKey, params]);
  const [period, setPeriod] = useState("month");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (!resolvedModuleKey) {
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);
    setError("");

    apiFetch(`/reports/focus/${resolvedModuleKey}?period=${period}`)
      .then((response) => {
        if (!cancelled) setData(response);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Failed to load module report");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [resolvedModuleKey, period]);

  const module = data?.module;

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Focused report</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900 break-words">{module?.title || "Module report"}</div>
            <div className="mt-2 max-w-3xl text-sm text-slate-500 break-words">{module?.description || "Detailed module analytics and business insight."}</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {PERIODS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setPeriod(item.key)}
                className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                  period === item.key
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <Link href={basePath} className="rounded-full border border-slate-200 px-3 py-2 text-slate-700 hover:bg-slate-50">
            ← Back to master reports
          </Link>
          <span className="rounded-full bg-slate-100 px-3 py-2 text-slate-600">{data?.meta?.scopeLabel || "Current scope"}</span>
          <span className="rounded-full bg-slate-100 px-3 py-2 text-slate-600">{data?.meta?.currentLabel || "Current period"}</span>
        </div>
      </div>

      {!resolvedModuleKey && !loading ? <ErrorBanner message="Module route is not ready yet. Please retry from the reports dashboard." /> : null}
      {error ? <ErrorBanner message={error} /> : null}
      {loading ? <LoadingBlock /> : null}
      {!loading && !error && module ? <ModuleSection module={module} basePath={basePath} compact /> : null}
    </div>
  );
}

function ReportsHero({ roleLabel, meta, period, setPeriod, headlineKpis, alerts, insights }) {
  return (
    <div className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-slate-950 via-indigo-900 to-cyan-700 p-6 text-white shadow-xl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.12),transparent_22%)]" />
      <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-100">Advanced reports workspace</div>
          <div className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">Business visibility for {roleLabel}</div>
          <div className="mt-3 text-sm text-slate-200 sm:text-base">
            Compare current versus previous performance, track alerts, and open focused analysis for every module in the dashboard sidebar.
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-100">
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-2">{meta?.scopeLabel || "Current scope"}</span>
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-2">{meta?.currentLabel || "This month"}</span>
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-2">Generated {meta?.generatedAt ? formatGeneratedAt(meta.generatedAt) : "now"}</span>
          </div>
        </div>
        <div className="rounded-[26px] border border-white/15 bg-white/10 p-4 backdrop-blur">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">Filter reports</div>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6 xl:grid-cols-3">
            {PERIODS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setPeriod(item.key)}
                className={`rounded-2xl px-3 py-2 text-xs font-semibold transition ${
                  period === item.key
                    ? "bg-white text-slate-900 shadow-sm"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {headlineKpis.map((item) => (
          <div key={item.label} className="rounded-[24px] border border-white/10 bg-white/10 p-4 backdrop-blur">
            <div className="text-sm text-slate-200">{item.label}</div>
            <div className="mt-2 break-words text-2xl font-semibold">{item.value}</div>
            <div className="mt-2 text-xs text-cyan-100">{item.note}</div>
          </div>
        ))}
      </div>

      <div className="relative z-10 mt-6 grid gap-4 lg:grid-cols-2">
        <ListPanel title="Alerts" items={alerts} emptyText="No important alerts in this period." />
        <ListPanel title="What looks good" items={insights} emptyText="Insights will appear when data is available." />
      </div>
    </div>
  );
}

function ModuleSection({ module, basePath, compact }) {
  const segments = Array.isArray(module?.segments) ? module.segments.filter(Boolean) : [];
  const [activeSegmentKey, setActiveSegmentKey] = useState(segments[0]?.key || "");

  useEffect(() => {
    setActiveSegmentKey(segments[0]?.key || "");
  }, [module?.key, segments[0]?.key]);

  const activeSegment = segments.find((segment) => segment.key === activeSegmentKey) || segments[0] || null;
  const detailSource = activeSegment || module;
  const kpis = Array.isArray(detailSource?.kpis) ? detailSource.kpis : [];
  const tables = Array.isArray(detailSource?.tables) ? detailSource.tables : [];
  const alerts = withFallbackItems(detailSource?.alerts, `No critical alerts in ${detailSource?.title || module?.title || "this module"} for the selected period.`);
  const insights = withFallbackItems(detailSource?.insights, `Performance is stable in ${detailSource?.title || module?.title || "this module"}. Review the detailed tables for action opportunities.`);

  return (
    <section id={`module-${module.key}`} className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
      <div className={`bg-gradient-to-r ${toneMap[module.heroTone] || toneMap.indigo} p-[1px]`}>
        <div className="rounded-t-[30px] bg-white/95 p-6 backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-4xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
                  {module.badge}
                </span>
                <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${tonePillClass(module.comparison?.tone)}`}>
                  {module.comparison?.deltaText || "0.0%"}
                </span>
              </div>
              <div className="mt-3 text-2xl font-semibold text-slate-900 break-words">{module.title}</div>
              <div className="mt-2 text-sm text-slate-500 break-words">{module.description}</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {!compact ? (
                <Link href={`${basePath}/${module.routeSegment || module.key}`} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                  Open focused report
                </Link>
              ) : null}
              <span className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-600">
                {module.comparison?.currentLabel || "Current"} vs {module.comparison?.previousLabel || "Previous"}
              </span>
            </div>
          </div>

          {segments.length ? (
            <div className="mt-6">
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Order report options</div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {segments.map((segment) => (
                  <button
                    key={segment.key}
                    type="button"
                    onClick={() => setActiveSegmentKey(segment.key)}
                    className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                      activeSegment?.key === segment.key
                        ? "bg-slate-900 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {segment.title}
                  </button>
                ))}
              </div>
              {activeSegment?.description ? (
                <div className="mt-3 text-sm text-slate-500">{activeSegment.description}</div>
              ) : null}
            </div>
          ) : null}

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {kpis.map((kpi) => (
              <div key={kpi.label} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm text-slate-500">{kpi.label}</div>
                <div className="mt-2 break-words text-2xl font-semibold text-slate-900">{kpi.value}</div>
                <div className="mt-2 text-xs text-slate-500">{kpi.note}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <ListPanel title="Alerts" items={alerts} emptyText="No alerts in this module right now." light />
            <ListPanel title="Insights" items={insights} emptyText="Insights will show when enough data is available." light />
          </div>
        </div>
      </div>

      <div className="grid gap-5 p-6">
        {tables.map((table) => (
          <DataTable key={`${detailSource?.key || module.key}-${table.title}`} table={table} />
        ))}
      </div>
    </section>
  );
}

function DataTable({ table }) {
  const columns = Array.isArray(table.columns) ? table.columns : [];
  const rows = Array.isArray(table.rows) ? table.rows : [];
  const tableMinWidth = Math.max(columns.length * 170, 760);

  return (
    <div className="rounded-[26px] border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-slate-900 break-words">{table.title}</div>
          <div className="mt-1 text-sm text-slate-500 break-words">{table.description}</div>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
          {table.count || rows.length} entries
        </span>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="max-h-[296px] overflow-auto">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: `${tableMinWidth}px` }}>
              <thead className="sticky top-0 z-10 bg-slate-100">
                <tr>
                  {columns.map((column) => (
                    <th key={column.key} className="min-w-[170px] border-b border-slate-200 px-4 py-3 text-left font-semibold text-slate-700 whitespace-nowrap">
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length ? (
                  rows.map((row, index) => (
                    <tr key={`${table.title}-${index}`} className="odd:bg-white even:bg-slate-50/60 hover:bg-cyan-50/40">
                      {columns.map((column) => (
                        <td key={column.key} className="min-w-[170px] border-b border-slate-100 px-4 py-3 align-top text-slate-700">
                          <div className="max-w-[280px] break-words">{String(row?.[column.key] ?? "—")}</div>
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={Math.max(columns.length, 1)} className="px-4 py-10 text-center text-slate-500">
                      No data available for this table.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function CompareCard({ title, block, currency = false }) {
  const currentValue = block?.currentValue ?? 0;
  const previousValue = block?.previousValue ?? 0;

  return (
    <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-slate-700">{title}</div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tonePillClass(block?.tone)}`}>
          {block?.deltaText || "0.0%"}
        </span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <CompareMetric label={block?.currentLabel || "Current"} value={currency ? formatMoney(currentValue) : formatNumber(currentValue)} />
        <CompareMetric label={block?.previousLabel || "Previous"} value={currency ? formatMoney(previousValue) : formatNumber(previousValue)} />
      </div>
    </div>
  );
}

function CompareMetric({ label, value }) {
  return (
    <div className="rounded-2xl bg-white p-3 shadow-sm">
      <div className="text-xs uppercase tracking-[0.16em] text-slate-400">{label}</div>
      <div className="mt-2 text-xl font-semibold text-slate-900 break-words">{value}</div>
    </div>
  );
}

function ListPanel({ title, items, emptyText, light = false }) {
  const rows = Array.isArray(items) ? items.filter(Boolean).slice(0, 6) : [];
  const panelClass = light
    ? "border border-slate-200 bg-slate-50"
    : "border border-white/10 bg-white/10 backdrop-blur";
  const titleClass = light ? "text-slate-900" : "text-white";
  const textClass = light ? "text-slate-600" : "text-slate-100";
  const bulletClass = light ? "bg-slate-900" : "bg-white";

  return (
    <div className={`rounded-[24px] p-4 ${panelClass}`}>
      <div className={`text-sm font-semibold ${titleClass}`}>{title}</div>
      <div className="mt-3 space-y-3">
        {rows.length ? (
          rows.map((item, index) => (
            <div key={`${title}-${index}`} className="flex items-start gap-3">
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${bulletClass}`} />
              <div className={`text-sm break-words ${textClass}`}>{item}</div>
            </div>
          ))
        ) : (
          <div className={`text-sm ${textClass}`}>{emptyText}</div>
        )}
      </div>
    </div>
  );
}

function withFallbackItems(items, fallbackText) {
  const rows = Array.isArray(items) ? items.filter(Boolean) : [];
  return rows.length ? rows : [fallbackText];
}

function ErrorBanner({ message }) {
  return (
    <div className="rounded-[24px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </div>
  );
}

function LoadingBlock() {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="animate-pulse space-y-4">
        <div className="h-6 w-60 rounded-full bg-slate-200" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 rounded-[24px] bg-slate-100" />
          ))}
        </div>
        <div className="h-64 rounded-[24px] bg-slate-100" />
      </div>
    </div>
  );
}

function toneClass(tone) {
  if (tone === "positive") return "text-emerald-600";
  if (tone === "negative") return "text-rose-600";
  return "text-slate-500";
}

function tonePillClass(tone) {
  if (tone === "positive") return "bg-emerald-100 text-emerald-700";
  if (tone === "negative") return "bg-rose-100 text-rose-700";
  return "bg-slate-100 text-slate-700";
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function formatMoney(value) {
  return `PKR ${formatNumber(value)}`;
}

function formatGeneratedAt(value) {
  const text = String(value || "");
  return text ? text.replace("T", " ").replace(/\..*/, "") : "now";
}
