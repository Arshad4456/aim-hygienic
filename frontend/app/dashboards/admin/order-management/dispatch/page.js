"use client";

import AdminShell from "../../components/AdminShell";

export default function OrderDispatchPage() {
  return (
    <AdminShell title="Pick & Dispatch" user={null}>
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="text-xl font-semibold text-zinc-900">Pick & Dispatch</div>
        <div className="text-sm text-zinc-500 mt-1">
          Allocate inventory, pick items, and dispatch deliveries with tracking.
        </div>
        <div className="mt-6 rounded-2xl border border-dashed bg-zinc-50 p-6 text-sm text-zinc-500">
          No dispatch tasks yet. Assign vehicles and routes when orders are approved.
        </div>
      </div>
    </AdminShell>
  );
}
