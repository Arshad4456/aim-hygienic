"use client";

import AdminShell from "../../components/AdminShell";

export default function FinalReleaseQcPage() {
  return (
    <AdminShell title="Final Release QC" user={null}>
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="text-xl font-semibold text-zinc-900">Final Release QC</div>
        <div className="text-sm text-zinc-500 mt-1">
          Approve final release for dispatch after QC sign-off.
        </div>
        <div className="mt-6 rounded-2xl border border-dashed bg-zinc-50 p-6 text-sm text-zinc-500">
          No final release approvals yet. Finalize QC when batches are complete.
        </div>
      </div>
    </AdminShell>
  );
}
