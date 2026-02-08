"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { apiFetch } from "../../../../lib/api";

export default function SalesReportPage() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    async function load() {
      setErr("");
      try {
        const data = await apiFetch("/reports/sales");
        setRows(data.regions || []);
      } catch (e) {
        setErr(e.message || "Failed to load sales report");
      }
    }
    load();
  }, []);

  const highlights = useMemo(() => {
    const totalOrders = rows.reduce((sum, row) => sum + Number(row.orders || 0), 0);
    const totalQuantity = rows.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
    const topRegion = rows[0]?.region || "—";
    return [
      { label: "Sales Orders", value: formatNumber(totalOrders) },
      { label: "Units Sold", value: formatNumber(totalQuantity) },
      { label: "Top Region", value: topRegion },
      { label: "Regions Covered", value: formatNumber(rows.length) },
    ];
  }, [rows]);

  return (
    <AdminShell title="Sales Reports" user={null}>
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="text-xl font-semibold text-zinc-900">Sales Performance</div>
        <div className="text-sm text-zinc-500 mt-1">
          Revenue, order velocity, and regional performance snapshots.
        </div>

        {err ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {err}
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {highlights.map((item) => (
            <div key={item.label} className="rounded-2xl border bg-zinc-50 p-4">
              <div className="text-xs text-zinc-500">{item.label}</div>
              <div className="text-lg font-semibold text-zinc-900 mt-2">{item.value}</div>
            </div>
          ))}
        </div>

        <div className="mt-6 overflow-auto rounded-xl border">
          <table className="min-w-[680px] w-full text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="text-left px-3 py-2 border-b">Region</th>
                <th className="text-left px-3 py-2 border-b">Orders</th>
                <th className="text-left px-3 py-2 border-b">Units Sold</th>
                <th className="text-left px-3 py-2 border-b">Last Movement</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-zinc-500">
                    No sales movements found
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
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
    </AdminShell>
  );
}

function formatNumber(value) {
  if (value === null || value === undefined) return "—";
  return Number(value).toLocaleString();
}