const tiles = [
  { title: "Company", href: "/admin/settings/company" },
  { title: "Region", href: "/admin/settings/regions" },
  { title: "Zone", href: "/admin/settings/zones" },
  { title: "City", href: "/admin/settings/cities" },
  { title: "Area", href: "/admin/settings/areas" },
  { title: "Distributors", href: "/admin/settings/distributors" },
  { title: "Warehouse", href: "/admin/settings/warehouses" },
  { title: "Vehicles", href: "/admin/settings/vehicles" },
  { title: "Banks", href: "/admin/settings/banks" },
  { title: "Users", href: "/admin/settings/users" },
  { title: "Claim Types", href: "/admin/settings/claim-types" },
];

export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <div className="text-xl font-bold">Settings</div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <a
            key={t.title}
            href={t.href}
            className="rounded-2xl border bg-white p-4 shadow-sm hover:bg-gray-50"
          >
            <div className="font-semibold">{t.title}</div>
            <div className="text-xs text-gray-500 mt-1">Manage {t.title}</div>
          </a>
        ))}
      </div>
    </div>
  );
}
