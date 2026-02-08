"use client";

import AdminShell from "../../components/AdminShell";

const highlights = [
  { label: "Gross Revenue", value: "৳ 8.7M" },
  { label: "Net Revenue", value: "৳ 7.9M" },
  { label: "Top Region", value: "Dhaka" },
  { label: "Top Customer", value: "Green Mart" },
];

const rows = [
  {
    region: "Dhaka",
    orders: 412,
    revenue: "৳ 3.2M",
    margin: "21%",
    growth: "+9.2%",
  },
  {
    region: "Chattogram",
    orders: 288,
    revenue: "৳ 2.1M",
    margin: "18%",
    growth: "+4.6%",
  },
  {
    region: "Khulna",
    orders: 190,
    revenue: "৳ 1.3M",
    margin: "19%",
    growth: "+6.1%",
  },
];

export default function SalesReportPage() {
  return (
    <AdminShell title="Sales Reports" user={null}>
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="text-xl font-semibold text-zinc-900">Sales Performance</div>
        <div className="text-sm text-zinc-500 mt-1">
          Revenue, order velocity, and regional performance snapshots.
        </div>

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
                <th className="text-left px-3 py-2 border-b">Revenue</th>
                <th className="text-left px-3 py-2 border-b">Margin</th>
                <th className="text-left px-3 py-2 border-b">Growth</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.region} className="hover:bg-zinc-50">
                  <td className="px-3 py-2 border-b font-medium text-zinc-900">{row.region}</td>
                  <td className="px-3 py-2 border-b">{row.orders}</td>
                  <td className="px-3 py-2 border-b">{row.revenue}</td>
                  <td className="px-3 py-2 border-b">{row.margin}</td>
                  <td className="px-3 py-2 border-b text-emerald-600">{row.growth}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
