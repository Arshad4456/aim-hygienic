"use client";

import AdminShell from "../../components/AdminShell";

export default function OrderReturnsPage() {
  return (
    <AdminShell title="Returns & Claims" user={null}>
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="text-xl font-semibold text-zinc-900">Returns & Claims</div>
        <div className="text-sm text-zinc-500 mt-1">
          Track returns, claims, replacements, and credit notes for sales orders.
        </div>
        <div className="mt-6 rounded-2xl border border-dashed bg-zinc-50 p-6 text-sm text-zinc-500">
          No return requests yet. Connect this flow to your delivery verification process.
        </div>
      </div>
    </AdminShell>
  );
}