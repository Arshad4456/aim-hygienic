"use client";

import AdminShell from "../../components/AdminShell";

export default function LogisticsDispatchPage() {
  return (
    <AdminShell title="Dispatch & Delivery" user={null}>
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="text-xl font-semibold text-zinc-900">Dispatch & Delivery</div>
        <div className="text-sm text-zinc-500 mt-1">
          Assign vehicles, drivers, and delivery schedules for orders.
        </div>
        <div className="mt-6 rounded-2xl border border-dashed bg-zinc-50 p-6 text-sm text-zinc-500">
          No dispatch runs yet. Approve orders to begin dispatch planning.
        </div>
      </div>
    </AdminShell>
  );
}
