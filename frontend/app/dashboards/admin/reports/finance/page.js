"use client";

import AdminShell from "../../components/AdminShell";

const metrics = [
  { label: "Total Expenses", value: "৳ 2.3M" },
  { label: "Approved This Month", value: "৳ 1.7M" },
  { label: "Outstanding Payables", value: "৳ 480K" },
  { label: "Cash on Hand", value: "৳ 620K" },
];

const rows = [
  {
    category: "Logistics",
    budget: "৳ 780K",
    actual: "৳ 690K",
    variance: "-11.5%",
    status: "On track",
  },
  {
    category: "Marketing",
    budget: "৳ 420K",
    actual: "৳ 510K",
    variance: "+21.4%",
    status: "Over budget",
  },
  {
    category: "Operations",
    budget: "৳ 610K",
    actual: "৳ 590K",
    variance: "-3.3%",
    status: "On track",
  },
];

export default function FinanceReportPage() {
  return (
    <AdminShell title="Finance Reports" user={null}>
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="text-xl font-semibold text-zinc-900">Finance & Expenses</div>
        <div className="text-sm text-zinc-500 mt-1">
          Track budget utilization, approvals, and cash position.
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
          <table className="min-w-[700px] w-full text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="text-left px-3 py-2 border-b">Category</th>
                <th className="text-left px-3 py-2 border-b">Budget</th>
                <th className="text-left px-3 py-2 border-b">Actual</th>
                <th className="text-left px-3 py-2 border-b">Variance</th>
                <th className="text-left px-3 py-2 border-b">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.category} className="hover:bg-zinc-50">
                  <td className="px-3 py-2 border-b font-medium text-zinc-900">{row.category}</td>
                  <td className="px-3 py-2 border-b">{row.budget}</td>
                  <td className="px-3 py-2 border-b">{row.actual}</td>
                  <td className="px-3 py-2 border-b">{row.variance}</td>
                  <td className="px-3 py-2 border-b">{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}