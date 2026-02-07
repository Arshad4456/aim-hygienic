"use client";

import AdminShell from "../components/AdminShell";

const cards = [
  {
    title: "Supplier Master",
    description: "Maintain supplier profiles and warehouse mappings.",
    href: "/dashboards/admin/procurement/suppliers",
  },
  {
    title: "Purchase Orders",
    description: "Create purchase orders and track approvals.",
    href: "/dashboards/admin/procurement/purchase-orders",
  },
  {
    title: "Goods Receipt (GRN)",
    description: "Record received goods with QC and batch details.",
    href: "/dashboards/admin/procurement/grn",
  },
  {
    title: "Supplier Payments",
    description: "Track supplier invoices and payment schedules.",
    href: "/dashboards/admin/procurement/payments",
  },
];

export default function ProcurementModulePage() {
  return (
    <AdminShell title="Procurement" user={null}>
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="text-xl font-semibold text-zinc-900">Procurement Module</div>
        <div className="text-sm text-zinc-500 mt-1">
          Manage suppliers, purchase orders, and goods receipts.
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
