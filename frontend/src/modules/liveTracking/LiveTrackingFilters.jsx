"use client";

import { defaultFilters } from "./utils";

function Select({ label, value, onChange, options = [] }) {
  return (
    <label className="text-xs text-zinc-600 flex flex-col gap-1">
      <span>{label}</span>
      <select
        className="rounded-lg border border-zinc-200 bg-white px-2 py-2 text-sm text-zinc-800"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">All</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function LiveTrackingFilters({ filters, setFilters, optionSets }) {
  function set(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-900">Filters</h3>
        <button
          type="button"
          className="text-xs text-emerald-700 hover:underline"
          onClick={() => setFilters(defaultFilters)}
        >
          Reset
        </button>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Select label="Role" value={filters.role} onChange={(v) => set("role", v)} options={optionSets.roles} />
        <Select label="Company" value={filters.companyId} onChange={(v) => set("companyId", v)} options={optionSets.companies} />
        <Select
          label="Distributor"
          value={filters.distributorId}
          onChange={(v) => set("distributorId", v)}
          options={optionSets.distributors}
        />
        <Select label="Region" value={filters.region} onChange={(v) => set("region", v)} options={optionSets.regions} />
        <Select label="Zone" value={filters.zone} onChange={(v) => set("zone", v)} options={optionSets.zones} />
        <Select
          label="Territory"
          value={filters.territory}
          onChange={(v) => set("territory", v)}
          options={optionSets.territories}
        />
        <Select label="Field" value={filters.field} onChange={(v) => set("field", v)} options={optionSets.fields} />
        <Select
          label="Tracking status"
          value={filters.status}
          onChange={(v) => set("status", v)}
          options={["online", "idle", "offline", "unknown"]}
        />
        <label className="text-xs text-zinc-600 flex flex-col gap-1 sm:col-span-2 xl:col-span-2">
          <span>Search</span>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => set("search", e.target.value)}
            placeholder="Name, role, user id…"
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
          />
        </label>
      </div>
    </div>
  );
}
