"use client";

import AdminShell from "../../components/AdminShell";

export default function SalesOrdersPage() {
  return (
    <AdminShell title="Sales Orders" user={null}>
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="text-xl font-semibold text-zinc-900">Sales Orders</div>
        <div className="text-sm text-zinc-500 mt-1">
          Create and track sales orders submitted by customers, distributors, or sales teams.
        </div>
        <div className="mt-6 rounded-2xl border border-dashed bg-zinc-50 p-6 text-sm text-zinc-500">
          No orders yet. Connect order intake from customer, distributor, and salesman dashboards.
        </div>
      </div>
    </AdminShell>
  );
}
