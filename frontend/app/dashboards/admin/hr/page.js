"use client";

import AdminShell from "../components/AdminShell";

const cards = [
  {
    title: "Add User",
    description: "Create users for warehouses, sales, and suppliers.",
    href: "/dashboards/admin/users/add",
  },
  {
    title: "User List",
    description: "Maintain roles, regions, zones, and territories.",
    href: "/dashboards/admin/users",
  },
];

export default function HrModulePage() {
  return (
    <AdminShell title="HR & Role Management" user={null}>
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="text-xl font-semibold text-zinc-900">HR & Role Management</div>
        <div className="text-sm text-zinc-500 mt-1">
          Manage users, roles, and territory assignments across the organization.
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
