"use client";

import AdminShell from "../../components/AdminShell";

const metrics = [
  { label: "QC Pass Rate", value: "98.1%" },
  { label: "Open NCRs", value: "6" },
  { label: "Audits Scheduled", value: "4" },
  { label: "CAPA Closed", value: "12" },
];

const rows = [
  {
    line: "Finished Goods",
    passRate: "99%",
    ncrs: 2,
    owner: "Quality",
  },
  {
    line: "Production",
    passRate: "97%",
    ncrs: 3,
    owner: "Operations",
  },
  {
    line: "Raw Materials",
    passRate: "96%",
    ncrs: 1,
    owner: "Procurement",
  },
];

export default function ComplianceReportPage() {
  return (
    <AdminShell title="Compliance Reports" user={null}>
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="text-xl font-semibold text-zinc-900">Compliance & Quality</div>
        <div className="text-sm text-zinc-500 mt-1">
          Audit readiness, QC performance, and non-conformance tracking.
        </div>

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
                <th className="text-left px-3 py-2 border-b">QC Line</th>
                <th className="text-left px-3 py-2 border-b">Pass Rate</th>
                <th className="text-left px-3 py-2 border-b">Open NCRs</th>
                <th className="text-left px-3 py-2 border-b">Owner</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.line} className="hover:bg-zinc-50">
                  <td className="px-3 py-2 border-b font-medium text-zinc-900">{row.line}</td>
                  <td className="px-3 py-2 border-b">{row.passRate}</td>
                  <td className="px-3 py-2 border-b">{row.ncrs}</td>
                  <td className="px-3 py-2 border-b">{row.owner}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
