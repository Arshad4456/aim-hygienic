"use client";

import AdminShell from "../../components/AdminShell";

const metrics = [
  { label: "Total SKUs", value: "1,280" },
  { label: "Low Stock Alerts", value: "36" },
  { label: "Avg. Days on Hand", value: "38" },
  { label: "Expiring Lots", value: "12" },
];

const rows = [
  {
    warehouse: "Dhaka",
    onHand: "42,380",
    coverage: "41 days",
    slowMovers: "18",
    expiryRisk: "High",
  },
  {
    warehouse: "Chattogram",
    onHand: "26,910",
    coverage: "34 days",
    slowMovers: "12",
    expiryRisk: "Medium",
  },
  {
    warehouse: "Khulna",
    onHand: "18,420",
    coverage: "39 days",
    slowMovers: "6",
    expiryRisk: "Low",
  },
];

export default function InventoryReportPage() {
  return (
    <AdminShell title="Inventory Reports" user={null}>
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="text-xl font-semibold text-zinc-900">Inventory Health</div>
        <div className="text-sm text-zinc-500 mt-1">
          Monitor stock coverage, slow movers, and expiry exposure by warehouse.
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
                <th className="text-left px-3 py-2 border-b">Warehouse</th>
                <th className="text-left px-3 py-2 border-b">Units on Hand</th>
                <th className="text-left px-3 py-2 border-b">Coverage</th>
                <th className="text-left px-3 py-2 border-b">Slow Movers</th>
                <th className="text-left px-3 py-2 border-b">Expiry Risk</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.warehouse} className="hover:bg-zinc-50">
                  <td className="px-3 py-2 border-b font-medium text-zinc-900">{row.warehouse}</td>
                  <td className="px-3 py-2 border-b">{row.onHand}</td>
                  <td className="px-3 py-2 border-b">{row.coverage}</td>
                  <td className="px-3 py-2 border-b">{row.slowMovers}</td>
                  <td className="px-3 py-2 border-b">{row.expiryRisk}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
