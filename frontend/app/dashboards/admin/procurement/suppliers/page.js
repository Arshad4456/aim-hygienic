"use client";

import AdminShell from "../../components/AdminShell";

export default function SupplierMasterPage() {
  return (
    <AdminShell title="Supplier Master" user={null}>
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="text-xl font-semibold text-zinc-900">Supplier Master</div>
        <div className="text-sm text-zinc-500 mt-1">
          Maintain supplier profiles and warehouse linkages.
        </div>
        <div className="mt-6 rounded-2xl border border-dashed bg-zinc-50 p-6 text-sm text-zinc-500">
          Use the Supplier role in User Management to register suppliers until a dedicated supplier form is added.
        </div>
      </div>
    </AdminShell>
  );
}