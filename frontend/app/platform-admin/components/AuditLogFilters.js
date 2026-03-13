"use client";

export default function AuditLogFilters({ filters, onChange, onApply }) {
  return (
    <div className="rounded-xl border bg-white p-4 grid grid-cols-1 md:grid-cols-6 gap-2">
      <input className="border rounded px-2 py-2 text-sm" placeholder="Search" value={filters.search || ""} onChange={(e) => onChange({ ...filters, search: e.target.value })} />
      <input className="border rounded px-2 py-2 text-sm" placeholder="Company ID" value={filters.companyId || ""} onChange={(e) => onChange({ ...filters, companyId: e.target.value })} />
      <input className="border rounded px-2 py-2 text-sm" placeholder="Action type" value={filters.actionType || ""} onChange={(e) => onChange({ ...filters, actionType: e.target.value })} />
      <input className="border rounded px-2 py-2 text-sm" placeholder="Target type" value={filters.targetType || ""} onChange={(e) => onChange({ ...filters, targetType: e.target.value })} />
      <input className="border rounded px-2 py-2 text-sm" type="date" value={filters.dateFrom || ""} onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })} />
      <input className="border rounded px-2 py-2 text-sm" type="date" value={filters.dateTo || ""} onChange={(e) => onChange({ ...filters, dateTo: e.target.value })} />
      <div className="md:col-span-6">
        <button onClick={onApply} className="rounded bg-emerald-600 text-white px-4 py-2 text-sm">Apply Filters</button>
      </div>
    </div>
  );
}
