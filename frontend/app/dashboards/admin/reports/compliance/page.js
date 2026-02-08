"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { apiFetch } from "../../../../lib/api";

export default function ComplianceReportPage() {
  const [report, setReport] = useState({ adjustmentCount: 0, returnCount: 0, messageCount: 0 });
  const [err, setErr] = useState("");

  useEffect(() => {
    async function load() {
      setErr("");
      try {
        const data = await apiFetch("/reports/compliance");
        setReport({
          adjustmentCount: data.adjustmentCount || 0,
          returnCount: data.returnCount || 0,
          messageCount: data.messageCount || 0,
        });
      } catch (e) {
        setErr(e.message || "Failed to load compliance report");
      }
    }
    load();
  }, []);

  const metrics = useMemo(() => {
    return [
      { label: "Inventory Adjustments", value: formatNumber(report.adjustmentCount) },
      { label: "Returns Logged", value: formatNumber(report.returnCount) },
      { label: "Compliance Messages", value: formatNumber(report.messageCount) },
      { label: "Audit Records", value: formatNumber(report.adjustmentCount + report.returnCount) },
    ];
  }, [report]);

  return (
    <AdminShell title="Compliance Reports" user={null}>
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="text-xl font-semibold text-zinc-900">Compliance & Quality</div>
        <div className="text-sm text-zinc-500 mt-1">
          Audit readiness, QC performance, and non-conformance tracking.
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
                <th className="text-left px-3 py-2 border-b">Compliance Signal</th>
                <th className="text-left px-3 py-2 border-b">Count</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: "Inventory Adjustments", value: report.adjustmentCount },
                { label: "Returns Logged", value: report.returnCount },
                { label: "Compliance Messages", value: report.messageCount },
              ].map((row) => (
                <tr key={row.label} className="hover:bg-zinc-50">
                  <td className="px-3 py-2 border-b font-medium text-zinc-900">{row.label}</td>
                  <td className="px-3 py-2 border-b">{formatNumber(row.value)}</td>
                </tr>
              ))}
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