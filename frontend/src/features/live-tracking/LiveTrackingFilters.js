"use client";

import { defaultFilters, normalizeRole } from "./utils";

function Select({ label, value, onChange, options = [] }) {
  return (
    <label className="text-xs text-zinc-600 flex flex-col gap-2">
      <span className="font-medium">{label}</span>
      <select
        className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-800 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
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

const QUICK_STATUSES = ["online", "idle", "offline"];
const QUICK_ROLES = ["supplier", "salesman", "order booker"];

export default function LiveTrackingFilters({ filters, setFilters, optionSets }) {
  function set(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function toggleChip(key, value) {
    setFilters((prev) => ({ ...prev, [key]: prev[key] === value ? "" : value }));
  }

  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-base font-semibold text-zinc-900">Control center filters</h3>
          <p className="mt-1 text-sm text-zinc-500">Use role chips for quick filtering, then narrow the view by company, distributor, and territory hierarchy.</p>
        </div>
        <button
          type="button"
          className="rounded-xl border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
          onClick={() => setFilters(defaultFilters)}
        >
          Reset all
        </button>
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-[1.1fr_1fr]">
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Quick roles</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {QUICK_ROLES.map((role) => {
              const active = normalizeRole(filters.role) === role;
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => toggleChip("role", role)}
                  className={`rounded-full border px-3 py-1.5 text-sm capitalize transition ${
                    active ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
                  }`}
                >
                  {role}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Quick statuses</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {QUICK_STATUSES.map((status) => {
              const active = filters.status === status;
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => toggleChip("status", status)}
                  className={`rounded-full border px-3 py-1.5 text-sm capitalize transition ${
                    active ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
                  }`}
                >
                  {status}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Select label="Company" value={filters.companyId} onChange={(v) => set("companyId", v)} options={optionSets.companies} />
        <Select label="Distributor" value={filters.distributorId} onChange={(v) => set("distributorId", v)} options={optionSets.distributors} />
        <Select label="Region" value={filters.region} onChange={(v) => set("region", v)} options={optionSets.regions} />
        <Select label="Zone" value={filters.zone} onChange={(v) => set("zone", v)} options={optionSets.zones} />
        <Select label="Territory" value={filters.territory} onChange={(v) => set("territory", v)} options={optionSets.territories} />
        <Select label="Field" value={filters.field} onChange={(v) => set("field", v)} options={optionSets.fields} />
        <Select label="Role (advanced)" value={filters.role} onChange={(v) => set("role", v)} options={optionSets.roles} />
        <Select label="Tracking status" value={filters.status} onChange={(v) => set("status", v)} options={["online", "idle", "offline", "unknown"]} />
        <label className="text-xs text-zinc-600 flex flex-col gap-2 sm:col-span-2 xl:col-span-2">
          <span className="font-medium">Search tracked user</span>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => set("search", e.target.value)}
            placeholder="Name, role, user id, territory…"
            className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
          />
        </label>
      </div>
    </div>
  );
}
