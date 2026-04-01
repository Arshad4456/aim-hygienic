"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../app/lib/api";
import {
  formatCompact,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  getAccentTheme,
  getSeverityTheme,
  toPct,
} from "./reportsTheme";

const filters = ["Today", "This week", "This month", "Quarter", "Year to date"];

export default function ReportsCommandCenter({ viewer = "management" }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activePreset, setActivePreset] = useState("This month");
  const [autoRefresh, setAutoRefresh] = useState(true);

  async function load() {
    setError("");
    try {
      const payload = await apiFetch("/reports/overview");
      setData(payload);
    } catch (err) {
      setError(err?.message || "Failed to load reports dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const id = setInterval(load, 45000);
    return () => clearInterval(id);
  }, [autoRefresh]);

  const dashboard = data?.dashboard || {};
  const headline = dashboard.headline || {};
  const tables = dashboard.tables || {};
  const sections = dashboard.sections || {};
  const context = data?.context || {};
  const alerts = tables.alertRows || [];
  const roleLabel = context.role || (viewer === "distributor" ? "Distributor" : "Company Admin");

  const heroSummary = useMemo(
    () => [
      { label: "Revenue pulse", value: formatCurrency(headline.revenue), note: `${formatNumber(headline.orders)} orders in scope` },
      { label: "Recovery risk", value: formatCurrency(headline.outstanding), note: `${formatNumber(headline.overdueRecoveryCount)} overdue follow-ups` },
      { label: "Customers active", value: formatNumber(headline.activeCustomers), note: `${formatNumber(headline.activeUsers)} users engaged` },
    ],
    [headline]
  );

  const activityFeed = useMemo(() => {
    const rows = [];
    if (headline.podMissing) rows.push({ title: `${formatNumber(headline.podMissing)} deliveries missing POD`, tone: "warning" });
    if (headline.lowStockCount) rows.push({ title: `${formatNumber(headline.lowStockCount)} products need replenishment`, tone: "critical" });
    if (headline.secondaryPaidBack) rows.push({ title: `${formatCurrency(headline.secondaryPaidBack)} secondary recovery posted back`, tone: "info" });
    if (headline.tripsCount) rows.push({ title: `${formatNumber(headline.tripsCount)} vehicle trips recorded`, tone: "info" });
    return rows;
  }, [headline]);

  const areaRows = tables.areaRows || [];
  const customerRows = tables.customerRows || [];
  const distributorRows = tables.distributorRows || [];
  const teamRows = tables.teamRows || [];
  const lowStockRows = tables.lowStockRows || [];
  const warehouseRows = tables.warehouseRows || [];

  function handleExport() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `aim-reports-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const rightRailRows = viewer === "distributor" ? teamRows.slice(0, 5) : distributorRows.slice(0, 5);

  return (
    <div className="space-y-6 pb-10">
      <section className="relative overflow-hidden rounded-[32px] bg-[radial-gradient(circle_at_top_left,_rgba(129,140,248,0.35),_transparent_26%),radial-gradient(circle_at_top_right,_rgba(34,211,238,0.22),_transparent_24%),linear-gradient(135deg,_#050816_0%,_#0f172a_40%,_#4c1d95_100%)] p-6 text-white shadow-[0_24px_120px_-36px_rgba(76,29,149,0.85)] ring-1 ring-white/10 md:p-8">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.06),transparent)]" />
        <div className="relative space-y-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium tracking-[0.24em] text-white/80 uppercase">
                AIM ERP • Reports intelligence
              </div>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{dashboard.hero?.title || "Reports command center"}</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70 md:text-base">{dashboard.hero?.subtitle || "Drive revenue, service, and recovery decisions from one premium business intelligence surface."}</p>
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-white/80">
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">Scope • {context.scope || viewer}</span>
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">Role • {roleLabel}</span>
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1">Updated • {formatDateTime(data?.generatedAt)}</span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:w-[420px]">
              {heroSummary.map((item) => (
                <div key={item.label} className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                  <div className="text-xs uppercase tracking-[0.18em] text-white/55">{item.label}</div>
                  <div className="mt-3 text-2xl font-semibold">{item.value}</div>
                  <div className="mt-3 text-xs text-white/65">{item.note}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
              {filters.map((item) => (
                <button
                  type="button"
                  key={item}
                  onClick={() => setActivePreset(item)}
                  className={`rounded-full px-4 py-2 text-sm transition ${
                    activePreset === item
                      ? "bg-white text-slate-950 shadow-lg"
                      : "border border-white/15 bg-white/8 text-white/75 hover:bg-white/15"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => setAutoRefresh((value) => !value)} className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm text-white/85 hover:bg-white/15">
                Auto refresh • {autoRefresh ? "On" : "Off"}
              </button>
              <button type="button" onClick={load} className="rounded-2xl border border-cyan-300/25 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-100 hover:bg-cyan-400/20">
                Refresh now
              </button>
              <button type="button" onClick={handleExport} className="rounded-2xl border border-emerald-300/25 bg-emerald-400/12 px-4 py-2 text-sm font-medium text-emerald-100 hover:bg-emerald-400/20">
                Export JSON
              </button>
              <button type="button" onClick={() => window.print()} className="rounded-2xl border border-fuchsia-300/25 bg-fuchsia-400/12 px-4 py-2 text-sm font-medium text-fuchsia-100 hover:bg-fuchsia-400/20">
                Print view
              </button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {(dashboard.kpis || []).map((item) => (
              <KpiCard key={item.label} item={item} />
            ))}
          </div>
        </div>
      </section>

      {error ? <div className="rounded-3xl border border-rose-300/30 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
      {loading ? <div className="rounded-3xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">Loading business intelligence feed…</div> : null}

      <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)_340px]">
        <aside className="space-y-5">
          <GlassPanel title="Navigator" subtitle="Jump into the most used reporting lenses.">
            <div className="space-y-3">
              {[
                { title: "Executive pulse", note: "Revenue, recovery, risk, operations" },
                { title: viewer === "distributor" ? "Territory focus" : "Area performance", note: "Territory, customer, distributor views" },
                { title: "Inventory & logistics", note: "Stock health, POD, delivery exceptions" },
                { title: "People & activity", note: "Team productivity and account health" },
              ].map((item, index) => (
                <div key={item.title} className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                      <div className="mt-1 text-xs leading-5 text-slate-500">{item.note}</div>
                    </div>
                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white">0{index + 1}</div>
                  </div>
                </div>
              ))}
            </div>
          </GlassPanel>

          <GlassPanel title="Smart insights" subtitle="Auto-curated management highlights.">
            <div className="space-y-3">
              {(dashboard.insights || []).map((item) => (
                <div key={item} className="rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm leading-6 text-slate-700">
                  {item}
                </div>
              ))}
            </div>
          </GlassPanel>
        </aside>

        <main className="space-y-5">
          <GlassPanel title="Revenue and execution mix" subtitle="Track sales trend, order mix, and fulfilment progress.">
            <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-[28px] bg-slate-950 px-5 py-5 text-white shadow-[0_24px_60px_-28px_rgba(15,23,42,0.65)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">Sales trend</div>
                    <div className="mt-1 text-xs text-white/55">Period • {activePreset}</div>
                  </div>
                  <div className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-white/80">{formatCompact(headline.revenue)}</div>
                </div>
                <div className="mt-5 flex items-end gap-3">
                  {(sections.salesTrend || []).length ? (
                    (sections.salesTrend || []).map((point) => <TrendBar key={point.label} label={point.label} value={point.revenue} points={sections.salesTrend} />)
                  ) : (
                    <div className="text-sm text-white/55">No sales trend yet.</div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {(sections.statusBreakdown || []).map((row) => (
                  <ProgressRow key={row.label} label={row.label} value={row.value} total={headline.orders} note={formatCurrency(row.amount)} />
                ))}
              </div>
            </div>
          </GlassPanel>

          <GlassPanel title={viewer === "distributor" ? "Territory performance board" : "Area and customer performance"} subtitle="Use these slices to compare where growth is accelerating and where attention is needed.">
            <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
              <DataTable
                title={viewer === "distributor" ? "Territory table" : "Area ranking"}
                headers={[viewer === "distributor" ? "Territory" : "Territory", "Region", "Orders", "Revenue", "Delivery %"]}
                rows={areaRows.slice(0, 6).map((row) => [row.territoryName, row.regionName, formatNumber(row.orders), formatCurrency(row.revenue), `${row.deliveryRate}%`])}
                emptyMessage="No area rows available."
              />
              <DataTable
                title="Customer intensity"
                headers={["Customer", "Orders", "Revenue", "Outstanding", "Last order"]}
                rows={customerRows.slice(0, 6).map((row) => [row.customerName, formatNumber(row.orders), formatCurrency(row.revenue), formatCurrency(row.outstanding), formatDate(row.lastOrderDate)])}
                emptyMessage="No customer activity available."
              />
            </div>
          </GlassPanel>

          <GlassPanel title={viewer === "distributor" ? "Product mix and collections" : "Inventory, recovery, and portfolio mix"} subtitle="Balance stock risk, collections pressure, and product demand together.">
            <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <MiniMetric label="On-hand units" value={formatNumber(headline.totalOnHand)} helper={viewer === "distributor" ? "Company inventory hidden at distributor scope" : `${formatNumber(warehouseRows.length)} warehouse summaries`} />
                  <MiniMetric label="Expense approvals" value={formatCurrency(headline.totalExpenses)} helper={`${formatNumber(headline.lowStockCount)} low stock alerts`} />
                  <MiniMetric label="Recovery paid back" value={formatCurrency(headline.secondaryPaidBack)} helper={`${formatNumber(headline.overdueRecoveryCount)} overdue balances`} />
                  <MiniMetric label="Receipts posted" value={formatCurrency(headline.totalReceipts)} helper={`${formatNumber(headline.messagesCount)} messages logged`} />
                </div>
                <DataTable
                  title={viewer === "distributor" ? "Top products sold" : "Top products by contribution"}
                  headers={["Product", "Qty", "Revenue"]}
                  rows={tables.productRows?.slice(0, 6).map((row) => [row.productName, formatNumber(row.quantity), formatCurrency(row.revenue)])}
                  emptyMessage="No product movement found."
                />
              </div>
              <div className="space-y-3">
                <div className="rounded-[28px] border border-slate-200 bg-slate-950/95 px-5 py-5 text-white">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">Expense category concentration</div>
                      <div className="mt-1 text-xs text-white/55">Monitor spend mix and watch dominant categories.</div>
                    </div>
                    <div className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-white/75">{sections.financeMix?.length || 0} categories</div>
                  </div>
                  <div className="mt-4 space-y-3">
                    {(sections.financeMix || []).slice(0, 6).map((row) => (
                      <DarkProgressRow key={row.label} label={row.label} value={row.value} total={headline.totalExpenses} note={`${formatNumber(row.count)} records`} />
                    ))}
                  </div>
                </div>
                {!viewer.includes("distributor") && warehouseRows.length ? (
                  <DataTable
                    title="Warehouse health"
                    headers={["Warehouse", "On hand", "In", "Out", "Last movement"]}
                    rows={warehouseRows.slice(0, 6).map((row) => [row.name, formatNumber(row.onHand), formatNumber(row.inQty), formatNumber(row.outQty), formatDate(row.lastMovementAt)])}
                    emptyMessage="Warehouse summaries are not available."
                  />
                ) : null}
              </div>
            </div>
          </GlassPanel>

          <GlassPanel title="Team command board" subtitle="Compare field execution, service completion, and POD discipline.">
            <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
              <DataTable
                title="Top performers"
                headers={["Name", "Role", "Orders", "Revenue", "POD rate"]}
                rows={teamRows.slice(0, 7).map((row) => [row.name, row.role, formatNumber(row.orders), formatCurrency(row.revenue), `${row.podRate}%`])}
                emptyMessage="No team performance rows found."
              />
              <div className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-cyan-50 via-white to-violet-50 p-5">
                <div className="text-sm font-semibold text-slate-900">Receipt workflow and approvals</div>
                <div className="mt-1 text-xs text-slate-500">See how approved, pending, and rejected receipt states are shaping cash flow.</div>
                <div className="mt-4 space-y-3">
                  {(sections.receiptMix || []).map((row) => (
                    <ProgressRow key={row.label} label={row.label} value={row.count} total={headline.activeCustomers || row.count} note={formatCurrency(row.value)} subtle />
                  ))}
                </div>
                <div className="mt-5 rounded-3xl bg-slate-950 px-4 py-4 text-white shadow-lg">
                  <div className="text-xs uppercase tracking-[0.2em] text-white/45">Service confidence</div>
                  <div className="mt-2 text-3xl font-semibold">{toPct(headline.totalReceipts, Math.max(headline.totalReceipts, headline.outstanding || 1))}%</div>
                  <div className="mt-2 text-sm text-white/65">This quick indicator compares captured receipts against the current outstanding pressure.</div>
                </div>
              </div>
            </div>
          </GlassPanel>
        </main>

        <aside className="space-y-5">
          <GlassPanel title="Critical watchlist" subtitle="Act fast on items that can hurt operations or recovery.">
            <div className="space-y-3">
              {alerts.length ? (
                alerts.slice(0, 8).map((item) => <AlertCard key={`${item.title}-${item.metric}`} item={item} />)
              ) : (
                <EmptyState message="No critical alerts right now." />
              )}
            </div>
          </GlassPanel>

          <GlassPanel title={viewer === "distributor" ? "Team roster snapshot" : "Distributor leaderboard"} subtitle={viewer === "distributor" ? "Your highest-impact people by recent order momentum." : "Highest-value distributors by revenue contribution."}>
            <div className="space-y-3">
              {rightRailRows.length ? rightRailRows.map((row) => <RightRailCard key={row.distributorName || row.name} row={row} viewer={viewer} />) : <EmptyState message="No rows available in this scope." />}
            </div>
          </GlassPanel>

          <GlassPanel title="Live activity feed" subtitle="Small operational signals that leaders usually ask about first.">
            <div className="space-y-3">
              {activityFeed.length ? activityFeed.map((row) => <ActivityItem key={row.title} row={row} />) : <EmptyState message="No recent activity signals were generated." />}
            </div>
          </GlassPanel>

          {viewer !== "distributor" ? (
            <GlassPanel title="Low stock watch" subtitle="Immediate replenishment candidates.">
              <div className="space-y-3">
                {lowStockRows.length ? (
                  lowStockRows.slice(0, 6).map((row) => (
                    <div key={row.productId || row.name} className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                      <div className="text-sm font-semibold text-slate-900">{row.name}</div>
                      <div className="mt-1 text-xs text-slate-500">{row.category || "General"}</div>
                      <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
                        <span>On hand • {formatNumber(row.onHand)}</span>
                        <span>Min • {formatNumber(row.minStockLevel)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState message="Low stock watchlist is clear." />
                )}
              </div>
            </GlassPanel>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function KpiCard({ item }) {
  const theme = getAccentTheme(item.accent);
  return (
    <div className={`relative overflow-hidden rounded-[28px] border ${theme.border} bg-gradient-to-br ${theme.panel} p-5 ring-1 ring-white/10 ${theme.glow}`}>
      <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
      <div className="relative">
        <div className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ring-1 ${theme.badge}`}>{item.label}</div>
        <div className="mt-4 text-3xl font-semibold text-white">{item.displayValue}</div>
        <div className="mt-2 text-sm text-white/80">{item.helper}</div>
        <div className="mt-4 text-xs uppercase tracking-[0.2em] text-white/55">{item.delta}</div>
      </div>
    </div>
  );
}

function GlassPanel({ title, subtitle, children }) {
  return (
    <section className="rounded-[32px] border border-slate-200 bg-white/90 p-5 shadow-[0_20px_60px_-28px_rgba(15,23,42,0.18)] backdrop-blur md:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-950">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm leading-6 text-slate-500">{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function TrendBar({ label, value, points }) {
  const max = Math.max(...points.map((point) => Number(point.revenue || 0)), 1);
  const height = Math.max(14, Math.round((Number(value || 0) / max) * 140));
  return (
    <div className="flex min-w-[56px] flex-1 flex-col items-center gap-3">
      <div className="text-[11px] text-white/55">{formatCompact(value)}</div>
      <div className="relative flex h-40 w-full items-end justify-center rounded-3xl bg-white/5 px-2 py-2">
        <div className="w-full rounded-3xl bg-gradient-to-t from-cyan-400 via-sky-400 to-violet-400 shadow-[0_20px_35px_-20px_rgba(34,211,238,0.85)]" style={{ height }} />
      </div>
      <div className="text-[11px] text-white/55">{label}</div>
    </div>
  );
}

function ProgressRow({ label, value, total, note, subtle = false }) {
  const width = `${Math.max(6, toPct(value, total))}%`;
  return (
    <div className={`rounded-2xl border px-4 py-3 ${subtle ? "border-slate-200 bg-white" : "border-slate-200 bg-slate-50/80"}`}>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-slate-800">{label}</span>
        <span className="font-semibold text-slate-950">{formatNumber(value)}</span>
      </div>
      <div className="mt-3 h-2 rounded-full bg-slate-200">
        <div className="h-2 rounded-full bg-gradient-to-r from-sky-500 via-violet-500 to-fuchsia-500" style={{ width }} />
      </div>
      <div className="mt-2 text-xs text-slate-500">{note}</div>
    </div>
  );
}

function DarkProgressRow({ label, value, total, note }) {
  const width = `${Math.max(8, toPct(value, total))}%`;
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <div className="flex items-center justify-between gap-3 text-sm text-white">
        <span className="font-medium text-white/85">{label}</span>
        <span className="font-semibold">{formatCurrency(value)}</span>
      </div>
      <div className="mt-3 h-2 rounded-full bg-white/10">
        <div className="h-2 rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-sky-400" style={{ width }} />
      </div>
      <div className="mt-2 text-xs text-white/55">{note}</div>
    </div>
  );
}

function MiniMetric({ label, value, helper }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white px-4 py-4">
      <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="mt-3 text-2xl font-semibold text-slate-950">{value}</div>
      <div className="mt-2 text-xs leading-5 text-slate-500">{helper}</div>
    </div>
  );
}

function DataTable({ title, headers = [], rows = [], emptyMessage }) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm text-slate-700">
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500">
            <tr>
              {headers.map((header) => (
                <th key={header} className="px-5 py-3 font-medium">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row, index) => (
                <tr key={`${title}-${index}`} className="border-t border-slate-100">
                  {row.map((cell, cellIndex) => (
                    <td key={`${title}-${index}-${cellIndex}`} className="px-5 py-3 align-top">{cell}</td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={Math.max(1, headers.length)} className="px-5 py-6 text-sm text-slate-500">{emptyMessage}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AlertCard({ item }) {
  const theme = getSeverityTheme(item.severity);
  return (
    <div className={`rounded-3xl border px-4 py-4 ${theme.panel}`}>
      <div className="flex items-start gap-3">
        <span className={`mt-1 h-3 w-3 rounded-full ${theme.dot}`} />
        <div className="min-w-0 flex-1">
          <div className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ${theme.chip}`}>{item.severity}</div>
          <div className="mt-3 text-sm font-semibold text-slate-900">{item.title}</div>
          <div className="mt-2 text-xs leading-5 text-slate-600">{item.reason}</div>
          {item.metric ? <div className="mt-3 text-[11px] uppercase tracking-[0.18em] text-slate-500">{item.metric}</div> : null}
        </div>
      </div>
    </div>
  );
}

function RightRailCard({ row, viewer }) {
  const title = viewer === "distributor" ? row.name : row.distributorName;
  const sub = viewer === "distributor" ? row.role : row.territoryName;
  const primary = viewer === "distributor" ? `${formatNumber(row.orders)} orders` : `${formatCurrency(row.revenue)} revenue`;
  const secondary = viewer === "distributor" ? `${formatCurrency(row.revenue)} revenue` : `${formatNumber(row.delivered)} delivered`;
  return (
    <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 px-4 py-4 shadow-[0_14px_40px_-22px_rgba(15,23,42,0.25)]">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-1 text-xs text-slate-500">{sub}</div>
      <div className="mt-4 flex items-center justify-between gap-3 text-sm text-slate-700">
        <span>{primary}</span>
        <span>{secondary}</span>
      </div>
      {row.lastOrderDate ? <div className="mt-3 text-[11px] uppercase tracking-[0.18em] text-slate-500">Last order • {formatDate(row.lastOrderDate)}</div> : null}
    </div>
  );
}

function ActivityItem({ row }) {
  const color = row.tone === "warning" ? "bg-amber-400" : row.tone === "critical" ? "bg-rose-400" : "bg-sky-400";
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <span className={`mt-1 h-3 w-3 rounded-full ${color}`} />
      <div className="text-sm leading-6 text-slate-700">{row.title}</div>
    </div>
  );
}

function EmptyState({ message }) {
  return <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-5 text-sm text-slate-500">{message}</div>;
}