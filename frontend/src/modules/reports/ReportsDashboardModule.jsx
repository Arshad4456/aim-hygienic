"use client";

import Link from "next/link";
import { useEffect } from "react";
import { toneClasses, formatDateTime, formatValue, formatCurrency, formatNumber } from "./utils";
import { useReportsDashboard } from "./useReportsDashboard";

function TableCard({ title, subtitle, columns = [], rows = [] }) {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-zinc-900">{title}</div>
          {subtitle ? <div className="mt-1 text-sm text-zinc-500">{subtitle}</div> : null}
        </div>
      </div>
      <div className="mt-4 overflow-auto rounded-2xl border border-zinc-200">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-50 text-zinc-600">
            <tr>
              {columns.map((column) => (
                <th key={column} className="border-b border-zinc-200 px-3 py-2 text-left font-medium">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row, index) => (
                <tr key={`${title}-${index}`} className="hover:bg-zinc-50">
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="border-b border-zinc-100 px-3 py-2 text-zinc-700">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length || 1} className="px-3 py-8 text-center text-zinc-500">
                  No records available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ReportsDashboardModule({
  variant = "admin",
  companies = [],
  canSelectCompany = false,
  companyDocId = "",
  setCompanyDocId,
  selectedCompany,
}) {
  useEffect(() => {
    if (!canSelectCompany) return;
    if (companyDocId) return;
    if (companies.length && typeof setCompanyDocId === "function") {
      const first = companies[0];
      setCompanyDocId(first._id || first.companyId || "");
    }
  }, [canSelectCompany, companyDocId, companies, setCompanyDocId]);

  const companyId = selectedCompany?._id || selectedCompany?.companyId || "";
  const companyName = selectedCompany?.name || selectedCompany?.companyName || "";
  const { loading, error, dashboard, reload } = useReportsDashboard({ companyId, companyName });

  const spotlight = dashboard?.spotlight || {};
  const regionalRows = (spotlight.regionalSales || []).map((row) => [row.label, formatNumber(row.orders), formatCurrency(row.value), formatNumber(row.delivered)]);
  const expenseRows = (spotlight.expenseCategories || []).map((row) => [row.label, formatNumber(row.count), formatCurrency(row.value)]);
  const teamRows = (spotlight.teamRoles || []).map((row) => [row.label, formatNumber(row.value)]);
  const warehouseRows = (spotlight.warehouseFlow || []).map((row) => [row.warehouse, formatNumber(row.inQty), formatNumber(row.outQty), formatNumber(row.movementCount)]);
  const paymentExposureRows = [
    ["Open primary invoices", formatNumber(spotlight.paymentExposure?.openInvoices)],
    ["Outstanding amount", formatCurrency(spotlight.paymentExposure?.outstanding)],
    ["Paid back amount", formatCurrency(spotlight.paymentExposure?.paidBack)],
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-[30px] border border-zinc-200 bg-gradient-to-br from-zinc-950 via-zinc-900 to-emerald-950 p-6 text-white shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-200/80">{dashboard?.hero?.eyebrow || "Business intelligence workspace"}</div>
            <div className="mt-3 text-3xl font-semibold tracking-tight">{dashboard?.hero?.title || "Reports Command Center"}</div>
            <div className="mt-3 max-w-3xl text-sm text-zinc-300">{dashboard?.hero?.description || "Operational reporting across the business."}</div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[360px]">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="text-[11px] uppercase tracking-wide text-zinc-400">Scope</div>
              <div className="mt-1 text-sm font-semibold text-white">{dashboard?.scope?.label || "Current business scope"}</div>
            </div>
            <button type="button" onClick={() => reload()} className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-zinc-900 transition hover:bg-emerald-50">
              Refresh reports
            </button>
          </div>
        </div>
      </div>

      {canSelectCompany ? (
        <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-base font-semibold text-zinc-900">Company reporting scope</div>
              <div className="mt-1 text-sm text-zinc-500">System admins can switch the reports workspace between companies without leaving the dashboard.</div>
            </div>
            <div className="min-w-[280px]">
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Company</label>
              <select value={companyDocId} onChange={(e) => setCompanyDocId?.(e.target.value)} className="mt-2 w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 outline-none focus:border-emerald-500">
                <option value="">Select company</option>
                {companies.map((company) => {
                  const value = company._id || company.companyId;
                  return (
                    <option key={value} value={value}>
                      {company.name || company.companyName || company.companyId || value}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </div>
      ) : null}

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
        {(dashboard?.kpis || []).map((card) => {
          const tone = toneClasses(card.tone);
          return (
            <div key={card.key} className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{card.label}</div>
                <span className={`h-2.5 w-2.5 rounded-full ${tone.dot}`} />
              </div>
              <div className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900">{formatValue(card.value, card.format)}</div>
              <div className="mt-2 text-xs text-zinc-500">{card.helper}</div>
            </div>
          );
        })}
      </div>

      <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-base font-semibold text-zinc-900">Professional report navigator</div>
            <div className="mt-1 text-sm text-zinc-500">Every report card is focused on a business decision area so managers can move from summary to diagnosis quickly.</div>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
            Last generated: <span className="font-medium text-zinc-900">{formatDateTime(dashboard?.recentActivity?.[0]?.at || new Date())}</span>
          </div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(dashboard?.cards || []).map((card) => (
            card.href ? (
              <Link key={card.key} href={card.href} className="rounded-3xl border border-zinc-200 bg-gradient-to-br from-white to-zinc-50 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow">
                <div className="inline-flex rounded-full border border-zinc-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{card.badge}</div>
                <div className="mt-4 text-lg font-semibold text-zinc-900">{card.title}</div>
                <div className="mt-2 text-sm text-zinc-500">{card.description}</div>
                <div className="mt-4 text-sm font-medium text-emerald-700">Open report →</div>
              </Link>
            ) : (
              <div key={card.key} className="rounded-3xl border border-zinc-200 bg-gradient-to-br from-white to-zinc-50 p-5 shadow-sm">
                <div className="inline-flex rounded-full border border-zinc-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{card.badge}</div>
                <div className="mt-4 text-lg font-semibold text-zinc-900">{card.title}</div>
                <div className="mt-2 text-sm text-zinc-500">{card.description}</div>
              </div>
            )
          ))}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
        <TableCard
          title={variant === "distributor" ? "Territory demand pulse" : "Regional / territory sales pulse"}
          subtitle="Focus on where demand is strongest and where service recovery is needed."
          columns={[variant === "distributor" ? "Territory" : "Region", "Orders", "Value", "Delivered"]}
          rows={regionalRows}
        />
        <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="text-base font-semibold text-zinc-900">Recent activity feed</div>
          <div className="mt-1 text-sm text-zinc-500">Newest commercial, receipt, and expense events across the selected scope.</div>
          <div className="mt-4 space-y-3">
            {(dashboard?.recentActivity || []).length ? (
              dashboard.recentActivity.map((item) => {
                const tone = toneClasses(item.tone);
                return (
                  <div key={item.id} className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-zinc-900">
                      <span className={`h-2.5 w-2.5 rounded-full ${tone.dot}`} />
                      {item.title}
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">{item.meta}</div>
                    <div className="mt-2 text-[11px] uppercase tracking-wide text-zinc-400">{formatDateTime(item.at)}</div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">No recent activity found.</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <TableCard title="Expense & spend pressure" subtitle="Which categories are consuming budget fastest." columns={["Category", "Count", "Amount"]} rows={expenseRows} />
        <TableCard title={variant === "distributor" ? "Team execution" : "Workforce distribution"} subtitle="Headcount and people distribution across the selected scope." columns={[variant === "distributor" ? "Role" : "Role", "Count"]} rows={teamRows} />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <TableCard title={variant === "distributor" ? "Collections & exposure" : "Payment exposure"} subtitle="Open invoices, outstanding primary balances, and repayments." columns={["Metric", "Value"]} rows={paymentExposureRows} />
        {variant === "distributor" ? (
          <TableCard title="Receipt workflow" subtitle="Collection health by approval status." columns={["Status", "Count", "Amount"]} rows={(spotlight.receiptStatuses || []).map((row) => [row.label, formatNumber(row.value), formatCurrency(row.amount)])} />
        ) : (
          <TableCard title="Warehouse flow" subtitle="Top warehouses by movement intensity and stock flow." columns={["Warehouse", "Inbound", "Outbound", "Movements"]} rows={warehouseRows} />
        )}
      </div>

      {loading ? <div className="text-sm text-zinc-500">Refreshing reports…</div> : null}
    </div>
  );
}