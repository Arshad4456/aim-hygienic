"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { apiFetch } from "../../../../lib/api";

export default function HrReportPage() {
  const [report, setReport] = useState({ totalUsers: 0, roleCounts: [], statusCounts: [] });
  const [err, setErr] = useState("");

  useEffect(() => {
    async function load() {
      setErr("");
      try {
        const data = await apiFetch("/reports/hr");
        setReport({
          totalUsers: data.totalUsers || 0,
          roleCounts: data.roleCounts || [],
          statusCounts: data.statusCounts || [],
        });
      } catch (e) {
        setErr(e.message || "Failed to load HR report");
      }
    }
    load();
  }, []);

  const metrics = useMemo(() => {
    const activeCount = report.statusCounts.find((row) => row.status === "active")?.count || 0;
    return [
      { label: "Total Employees", value: formatNumber(report.totalUsers) },
      { label: "Active Staff", value: formatNumber(activeCount) },
      { label: "Roles Covered", value: formatNumber(report.roleCounts.length) },
      { label: "Status Groups", value: formatNumber(report.statusCounts.length) },
    ];
  }, [report]);

  return (
    <AdminShell title="HR Reports" user={null}>
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="text-xl font-semibold text-zinc-900">HR & Productivity</div>
        <div className="text-sm text-zinc-500 mt-1">
          Workforce distribution, attendance, and attrition metrics.
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
                <th className="text-left px-3 py-2 border-b">Role</th>
                <th className="text-left px-3 py-2 border-b">Headcount</th>
              </tr>
            </thead>
            <tbody>
              {report.roleCounts.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-3 py-6 text-center text-zinc-500">
                    No users found
                  </td>
                </tr>
              ) : (
                report.roleCounts.map((row) => (
                  <tr key={row.role} className="hover:bg-zinc-50">
                    <td className="px-3 py-2 border-b font-medium text-zinc-900">{row.role}</td>
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