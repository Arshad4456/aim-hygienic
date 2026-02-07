"use client";

import AdminShell from "../components/AdminShell";

const cards = [
  {
    title: "Warehouse Master",
    description: "Create and manage warehouse profiles, capacity, and managers.",
    href: "/dashboards/admin/inventory/warehouses",
  },
  {
    title: "Inventory Ledger",
    description: "Track every stock movement with audit trails.",
    href: "/dashboards/admin/inventory/ledger",
  },
  {
    title: "Stock Transfers",
    description: "Request, approve, and receive inter-warehouse transfers.",
    href: "/dashboards/admin/inventory/transfers",
  },
  {
    title: "Stock Summary",
    description: "View stock on-hand by product and warehouse.",
    href: "/dashboards/admin/inventory/summary",
  },
  {
    title: "Low Stock Alerts",
    description: "Monitor minimum stock thresholds and replenishment needs.",
    href: "/dashboards/admin/inventory/low-stock",
  },
  {
    title: "Territory Mapping",
    description: "Maintain Warehouse → Region → Zone → Area hierarchy.",
    href: "/dashboards/admin/zones",
  },
];

export default function WarehouseInventoryModulePage() {
  return (
    <AdminShell title="Warehouse & Inventory" user={null}>
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="text-xl font-semibold text-zinc-900">Warehouse & Inventory Module</div>
        <div className="text-sm text-zinc-500 mt-1">
          Ledger-based stock tracking with warehouse, territory, and transfer operations.
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
