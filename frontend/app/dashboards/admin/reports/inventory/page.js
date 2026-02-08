"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { apiFetch } from "../../../../lib/api";

export default function InventoryReportPage() {
  const [report, setReport] = useState({ totalProducts: 0, warehouses: [] });
  const [err, setErr] = useState("");

  useEffect(() => {
    async function load() {
      setErr("");
      try {
        const data = await apiFetch("/reports/inventory");
        setReport({ totalProducts: data.totalProducts || 0, warehouses: data.warehouses || [] });
      } catch (e) {
        setErr(e.message || "Failed to load inventory report");
      }
    }
    load();
  }, []);

  const metrics = useMemo(() => {
    const totalOnHand = report.warehouses.reduce((sum, row) => sum + Number(row.onHand || 0), 0);
    const totalMovements = report.warehouses.reduce((sum, row) => sum + Number(row.movementCount || 0), 0);
    return [
      { label: "Total SKUs", value: formatNumber(report.totalProducts) },
      { label: "Warehouses", value: formatNumber(report.warehouses.length) },
      { label: "Units on Hand", value: formatNumber(totalOnHand) },
      { label: "Movements Logged", value: formatNumber(totalMovements) },
    ];
  }, [report]);

  return (
    <AdminShell title="Inventory Reports" user={null}>
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="text-xl font-semibold text-zinc-900">Inventory Health</div>
        <div className="text-sm text-zinc-500 mt-1">
          Monitor stock coverage, slow movers, and expiry exposure by warehouse.
        </div>

        {err ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {err}
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((item) => (
            <div key={item.label} className="rounded-2xl border bg-zinc-50 p-4">
              <div className="text-xs text-zinc-500">{item.label}</div>
              <div className="text-lg font-semibold text-zinc-900 mt-2">{item.value}</div>
            </div>
          ))}
        </div>

        <div className="mt-6 overflow-auto rounded-xl border">
          <table className="min-w-[700px] w-full text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="text-left px-3 py-2 border-b">Warehouse</th>
                <th className="text-left px-3 py-2 border-b">Units on Hand</th>
                <th className="text-left px-3 py-2 border-b">Inbound</th>
                <th className="text-left px-3 py-2 border-b">Outbound</th>
                <th className="text-left px-3 py-2 border-b">Last Movement</th>
              </tr>
            </thead>
            <tbody>
              {report.warehouses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-zinc-500">
                    No inventory movements found
                  </td>
                </tr>
              ) : (
                report.warehouses.map((row) => (
                  <tr key={row.warehouse} className="hover:bg-zinc-50">
                    <td className="px-3 py-2 border-b font-medium text-zinc-900">{row.warehouse}</td>
                    <td className="px-3 py-2 border-b">{formatNumber(row.onHand)}</td>
                    <td className="px-3 py-2 border-b">{formatNumber(row.inQty)}</td>
                    <td className="px-3 py-2 border-b">{formatNumber(row.outQty)}</td>
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