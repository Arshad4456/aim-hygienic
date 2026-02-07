"use client";

import AdminShell from "../components/AdminShell";

const cards = [
  {
    title: "Route Planning",
    description: "Design routes by warehouse, zone, and area coverage.",
    href: "/dashboards/admin/logistics/routes",
  },
  {
    title: "Dispatch & Delivery",
    description: "Assign vehicles and drivers to delivery runs.",
    href: "/dashboards/admin/logistics/dispatch",
  },
  {
    title: "Vehicle Assignment",
    description: "Maintain vehicle master and delivery capacity.",
    href: "/dashboards/admin/assets/vehicles",
  },
];

export default function LogisticsModulePage() {
  return (
    <AdminShell title="Distribution & Logistics" user={null}>
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="text-xl font-semibold text-zinc-900">Distribution & Logistics</div>
        <div className="text-sm text-zinc-500 mt-1">
          Plan routes, dispatch deliveries, and track fleet utilization.
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <a
              key={card.title}
              href={card.href}
              className="rounded-2xl border bg-zinc-50 p-4 hover:bg-white hover:shadow"
            >
              <div className="text-sm font-semibold text-zinc-900">{card.title}</div>
              <div className="text-xs text-zinc-500 mt-2">{card.description}</div>
            </a>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}