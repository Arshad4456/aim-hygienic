"use client";

import AdminShell from "../../components/AdminShell";

const metrics = [
  { label: "On-time Delivery", value: "96.4%" },
  { label: "Active Routes", value: "38" },
  { label: "Fleet Utilization", value: "82%" },
  { label: "Avg. Delivery Time", value: "2.4 hrs" },
];

const rows = [
  {
    route: "Dhaka Central",
    deliveries: 128,
    onTime: "97%",
    utilization: "85%",
  },
  {
    route: "Chattogram Coastal",
    deliveries: 94,
    onTime: "95%",
    utilization: "79%",
  },
  {
    route: "Khulna Metro",
    deliveries: 76,
    onTime: "96%",
    utilization: "82%",
  },
];

export default function LogisticsReportPage() {
  return (
    <AdminShell title="Logistics Reports" user={null}>
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="text-xl font-semibold text-zinc-900">Logistics & Delivery</div>
        <div className="text-sm text-zinc-500 mt-1">
          Route performance, fleet utilization, and delivery efficiency.
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
                <th className="text-left px-3 py-2 border-b">Route</th>
                <th className="text-left px-3 py-2 border-b">Deliveries</th>
                <th className="text-left px-3 py-2 border-b">On-time</th>
                <th className="text-left px-3 py-2 border-b">Utilization</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.route} className="hover:bg-zinc-50">
                  <td className="px-3 py-2 border-b font-medium text-zinc-900">{row.route}</td>
                  <td className="px-3 py-2 border-b">{row.deliveries}</td>
                  <td className="px-3 py-2 border-b">{row.onTime}</td>
                  <td className="px-3 py-2 border-b">{row.utilization}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}