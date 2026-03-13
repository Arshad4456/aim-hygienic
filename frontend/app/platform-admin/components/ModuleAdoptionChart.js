"use client";

export default function ModuleAdoptionChart({ rows = [] }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="font-semibold mb-3">Module Adoption</div>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.moduleCode} className="flex items-center justify-between rounded border px-3 py-2">
            <span className="text-sm">{row.moduleCode}</span>
            <span className="text-sm font-medium">{row.companyCount} companies</span>
          </div>
        ))}
        {rows.length === 0 ? <div className="text-sm text-zinc-500">No module adoption data.</div> : null}
      </div>
    </div>
  );
}
