export default function AdminDashboard() {
  const cards = [
    { title: "Total Distributors", value: "12", sub: "Active: 11 • Inactive: 1" },
    { title: "Total Products", value: "148", sub: "Categories: 5 • Families: 18" },
    { title: "Today Orders", value: "26", sub: "Pending: 6 • Delivered: 14" },
    { title: "Sales KPI", value: "PKR 1.24M", sub: "MTD: PKR 18.6M" },
  ];

  return (
    <div className="space-y-4">
      <div className="text-xl font-bold">Admin Dashboard</div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.title} className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="text-sm text-gray-500">{c.title}</div>
            <div className="text-2xl font-bold mt-1">{c.value}</div>
            <div className="text-xs text-gray-500 mt-1">{c.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="font-semibold">Quick Actions</div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <a className="rounded-xl border px-3 py-2 hover:bg-gray-50" href="/admin/settings">
              Settings
            </a>
            <a className="rounded-xl border px-3 py-2 hover:bg-gray-50" href="/admin/settings/regions">
              Manage Regions
            </a>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="font-semibold">Recent Activity (Demo)</div>
          <ul className="mt-3 text-sm text-gray-600 space-y-2">
            <li>• Admin created Region “RWP”</li>
            <li>• Price updated for “Mamia Diaper Maxi 28x6”</li>
            <li>• New Distributor registered: “Sadaat Group (RWP)”</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

