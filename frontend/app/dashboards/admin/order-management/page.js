"use client";

import AdminShell from "../components/AdminShell";

const cards = [
  {
    title: "Sales Orders",
    description: "Capture customer, distributor, or salesman orders.",
    href: "/dashboards/admin/order-management/sales-orders",
  },
  {
    title: "Order Approvals",
    description: "Approve orders based on credit limits and stock checks.",
    href: "/dashboards/admin/order-management/approvals",
  },
  {
    title: "Pick & Dispatch",
    description: "Allocate inventory, pick, pack, and dispatch orders.",
    href: "/dashboards/admin/order-management/dispatch",
  },
  {
    title: "Returns & Claims",
    description: "Handle RMA, claims, and replacements.",
    href: "/dashboards/admin/order-management/returns",
  },
];

export default function OrderManagementModulePage() {
  return (
    <AdminShell title="Order Management" user={null}>
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="text-xl font-semibold text-zinc-900">Order Management Module</div>
        <div className="text-sm text-zinc-500 mt-1">
          Manage the end-to-end sales order lifecycle from request to delivery.
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