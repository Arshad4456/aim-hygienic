"use client";

import AdminShell from "../../components/AdminShell";

export default function LogisticsRoutesPage() {
  return (
    <AdminShell title="Route Planning" user={null}>
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="text-xl font-semibold text-zinc-900">Route Planning</div>
        <div className="text-sm text-zinc-500 mt-1">
          Build delivery routes by warehouse, zone, and area.
        </div>
        <div className="mt-6 rounded-2xl border border-dashed bg-zinc-50 p-6 text-sm text-zinc-500">
          No routes configured yet. Add your first route plan to dispatch deliveries faster.
        </div>
      </div>
    </AdminShell>
  );
}