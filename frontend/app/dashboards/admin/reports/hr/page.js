"use client";

import AdminShell from "../../components/AdminShell";

const metrics = [
  { label: "Total Employees", value: "214" },
  { label: "Open Roles", value: "8" },
  { label: "Attendance", value: "97.2%" },
  { label: "Training Completion", value: "88%" },
];

const rows = [
  {
    department: "Sales",
    headcount: 64,
    attendance: "96%",
    attrition: "1.8%",
  },
  {
    department: "Operations",
    headcount: 58,
    attendance: "97%",
    attrition: "1.2%",
  },
  {
    department: "Logistics",
    headcount: 42,
    attendance: "98%",
    attrition: "2.4%",
  },
];

export default function HrReportPage() {
  return (
    <AdminShell title="HR Reports" user={null}>
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="text-xl font-semibold text-zinc-900">HR & Productivity</div>
        <div className="text-sm text-zinc-500 mt-1">
          Workforce distribution, attendance, and attrition metrics.
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
                <th className="text-left px-3 py-2 border-b">Department</th>
                <th className="text-left px-3 py-2 border-b">Headcount</th>
                <th className="text-left px-3 py-2 border-b">Attendance</th>
                <th className="text-left px-3 py-2 border-b">Attrition</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.department} className="hover:bg-zinc-50">
                  <td className="px-3 py-2 border-b font-medium text-zinc-900">{row.department}</td>
                  <td className="px-3 py-2 border-b">{row.headcount}</td>
                  <td className="px-3 py-2 border-b">{row.attendance}</td>
                  <td className="px-3 py-2 border-b">{row.attrition}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}