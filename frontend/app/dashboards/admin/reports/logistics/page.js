"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { apiFetch } from "../../../../lib/api";

export default function LogisticsReportPage() {
  const [report, setReport] = useState({ vehicleCount: 0, transferCounts: [] });
  const [err, setErr] = useState("");

  useEffect(() => {
    async function load() {
      setErr("");
      try {
        const data = await apiFetch("/reports/logistics");
        setReport({
          vehicleCount: data.vehicleCount || 0,
          transferCounts: data.transferCounts || [],
        });
      } catch (e) {
        setErr(e.message || "Failed to load logistics report");
      }
    }
    load();
  }, []);

  const metrics = useMemo(() => {
    const totalTransfers = report.transferCounts.reduce((sum, row) => sum + Number(row.count || 0), 0);
    return [
      { label: "Vehicles Tracked", value: formatNumber(report.vehicleCount) },
      { label: "Transfers Logged", value: formatNumber(totalTransfers) },
      { label: "Status Buckets", value: formatNumber(report.transferCounts.length) },
      { label: "Active Transfers", value: formatNumber(activeTransfers(report.transferCounts)) },
    ];
  }, [report]);

  return (
    <AdminShell title="Logistics Reports" user={null}>
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="text-xl font-semibold text-zinc-900">Logistics & Delivery</div>
        <div className="text-sm text-zinc-500 mt-1">
          Route performance, fleet utilization, and delivery efficiency.
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
          <table className="min-w-[640px] w-full text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="text-left px-3 py-2 border-b">Transfer Status</th>
                <th className="text-left px-3 py-2 border-b">Count</th>
              </tr>
            </thead>
            <tbody>
              {report.transferCounts.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-3 py-6 text-center text-zinc-500">
                    No stock transfers found
                  </td>
                </tr>
              ) : (
                report.transferCounts.map((row) => (
                  <tr key={row.status} className="hover:bg-zinc-50">
                    <td className="px-3 py-2 border-b font-medium text-zinc-900">{row.status}</td>
                    <td className="px-3 py-2 border-b">{formatNumber(row.count)}</td>
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

function activeTransfers(rows) {
  return rows.reduce((sum, row) => {
    if (row.status === "completed") return sum;
    return sum + Number(row.count || 0);
  }, 0);
}
