"use client";

import AdminShell from "../components/AdminShell";

const cards = [
  {
    title: "Invoices",
    description: "Create and manage sales invoices and billing.",
    href: "/dashboards/admin/finance/invoices",
  },
  {
    title: "Receipts",
    description: "Record customer receipts and settlement status.",
    href: "/dashboards/admin/finance/receipts",
  },
  {
    title: "Aging Report",
    description: "Monitor outstanding receivables by aging bucket.",
    href: "/dashboards/admin/finance/aging",
  },
];

export default function FinanceModulePage() {
  return (
    <AdminShell title="Finance & Accounts" user={null}>
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="text-xl font-semibold text-zinc-900">Finance & Accounts</div>
        <div className="text-sm text-zinc-500 mt-1">
          Track invoices, receipts, and profitability by product and warehouse.
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
