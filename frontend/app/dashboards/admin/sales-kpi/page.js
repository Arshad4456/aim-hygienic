"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "../components/AdminShell";
import { apiFetch } from "../../../lib/api";

export default function SalesKpiPage() {
  const [summary, setSummary] = useState(null);
  const [regions, setRegions] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [topWarehouses, setTopWarehouses] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    async function load() {
      setErr("");
      try {
        const data = await apiFetch("/sales-kpi/summary");
        setSummary(data.summary || null);
        setRegions(data.regions || []);
        setTopProducts(data.topProducts || []);
        setTopWarehouses(data.topWarehouses || []);
      } catch (e) {
        setErr(e.message || "Failed to load sales KPI");
      }
    }
    load();
  }, []);

  const metrics = useMemo(() => {
    return [
      { label: "Sales Orders", value: formatNumber(summary?.orders) },
      { label: "Units Sold", value: formatNumber(summary?.quantity) },
      { label: "Regions Covered", value: formatNumber(summary?.regions) },
      { label: "Top Region", value: regions[0]?.region || "—" },
    ];
  }, [summary, regions]);

  const regionMix = useMemo(() => {
    if (regions.length) return regions.slice(0, 5);
    return [
      { region: "Dhaka", orders: 0, quantity: 0 },
      { region: "Chattogram", orders: 0, quantity: 0 },
      { region: "Khulna", orders: 0, quantity: 0 },
    ];
  }, [regions]);

  return (
    <AdminShell title="Sales KPI" user={null}>
      <div className="rounded-2xl bg-white border shadow-sm p-5">
        <div className="text-xl font-semibold text-zinc-900">Sales KPI Dashboard</div>
        <div className="text-sm text-zinc-500 mt-1">
          Track sales velocity, regional contribution, and product performance in real time.
        </div>

        {err ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {err}
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-2xl border bg-zinc-50 p-4">
              <div className="text-xs text-zinc-500">{metric.label}</div>
              <div className="text-lg font-semibold text-zinc-900 mt-2">{metric.value}</div>
            </div>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="rounded-2xl border bg-white p-4 xl:col-span-2">
            <div className="text-sm font-semibold text-zinc-900">Regional Contribution</div>
            <div className="mt-3 overflow-auto rounded-xl border">
              <table className="min-w-[640px] w-full text-sm">
                <thead className="bg-zinc-50">
                  <tr>
                    <th className="text-left px-3 py-2 border-b">Region</th>
                    <th className="text-left px-3 py-2 border-b">Orders</th>
                    <th className="text-left px-3 py-2 border-b">Units Sold</th>
                    <th className="text-left px-3 py-2 border-b">Last Movement</th>
                  </tr>
                </thead>
                <tbody>
                  {regions.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-center text-zinc-500">
                        No regional sales data available
                      </td>
                    </tr>
                  ) : (
                    regions.map((row) => (
                      <tr key={row.region} className="hover:bg-zinc-50">
                        <td className="px-3 py-2 border-b font-medium text-zinc-900">{row.region}</td>
                        <td className="px-3 py-2 border-b">{formatNumber(row.orders)}</td>
                        <td className="px-3 py-2 border-b">{formatNumber(row.quantity)}</td>
                        <td className="px-3 py-2 border-b">
                          {row.lastMovementAt ? new Date(row.lastMovementAt).toLocaleDateString() : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border bg-white p-4">
              <div className="text-sm font-semibold text-zinc-900">Regional Mix</div>
              <div className="mt-3 space-y-3">
                {regionMix.map((row, index) => (
                  <MixRow
                    key={`${row.region}-${index}`}
                    label={row.region}
                    value={row.quantity}
                    total={regionMix.reduce((sum, item) => sum + Number(item.quantity || 0), 0)}
                    colorIndex={index}
                  />
                ))}
              </div>
            </div>
            <InsightCard
              title="Top Products"
              rows={topProducts}
              labelKey="product"
              valueLabel="Units"
              valueKey="quantity"
            />
            <InsightCard
              title="Top Warehouses"
              rows={topWarehouses}
              labelKey="warehouse"
              valueLabel="Units"
              valueKey="quantity"
            />
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

function InsightCard({ title, rows, labelKey, valueKey, valueLabel }) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="text-sm font-semibold text-zinc-900">{title}</div>
      <div className="mt-3 space-y-3">
        {rows.length === 0 ? (
          <div className="text-sm text-zinc-500">No data available.</div>
        ) : (
          rows.map((row) => (
            <div key={row[labelKey]} className="flex items-center justify-between">
              <div className="text-sm text-zinc-700">{row[labelKey]}</div>
              <div className="text-sm font-semibold text-zinc-900">
                {formatNumber(row[valueKey])} {valueLabel}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function formatNumber(value) {
  if (value === null || value === undefined) return "—";
  return Number(value).toLocaleString();
}

function MixRow({ label, value, total, colorIndex }) {
  const colors = ["bg-emerald-500", "bg-blue-500", "bg-amber-500", "bg-violet-500", "bg-rose-500"];
  const safeTotal = total || 1;
  const percentage = Math.round((Number(value || 0) / safeTotal) * 100);
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>{label}</span>
        <span>{percentage}%</span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-zinc-100">
        <div
          className={`h-2 rounded-full ${colors[colorIndex % colors.length]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}