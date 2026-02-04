"use client";

import { useMemo, useState } from "react";
import AdminShell from "../components/AdminShell";

const companies = [
  { id: "C-001", name: "AIM Hygienic" },
  { id: "C-002", name: "CleanPro Supplies" },
];

const roles = [
  "Sales Manager",
  "Warehouse Manager",
  "Accountant",
  "Distributor",
  "Driver",
  "Delivery Boy",
  "Sales Man",
  "Order Booker",
  "Customer",
];

const seedUsers = Array.from({ length: 72 }, (_, index) => {
  const company = companies[index % companies.length];
  const role = roles[index % roles.length];
  const idx = String(index + 1).padStart(3, "0");
  return {
    id: `U-${idx}`,
    name: `${role.split(" ")[0]} User ${idx}`,
    role,
    companyId: company.id,
    companyName: company.name,
    warehouseName: `Warehouse ${((index % 3) + 1).toString()}`,
    regionName: `Region ${((index % 4) + 1).toString()}`,
    zoneName: `Zone ${((index % 5) + 1).toString()}`,
    areaName: `Area ${((index % 6) + 1).toString()}`,
    phone: "+92 300 1234567",
    email: `user${idx}@example.com",
  };
});

export default function UserListPage() {
  const [companyId, setCompanyId] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [zoneFilter, setZoneFilter] = useState("");
  const [areaFilter, setAreaFilter] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState(seedUsers);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(null);

  const selectedCompany = companies.find((c) => c.id === companyId);

  const filtered = useMemo(() => {
    let next = rows;
    if (companyId) {
      next = next.filter((u) => u.companyId === companyId);
    }
    if (roleFilter) {
      next = next.filter((u) => u.role === roleFilter);
    }
    if (warehouseFilter) {
      next = next.filter((u) => u.warehouseName === warehouseFilter);
    }
    if (regionFilter) {
      next = next.filter((u) => u.regionName === regionFilter);
    }
    if (zoneFilter) {
      next = next.filter((u) => u.zoneName === zoneFilter);
    }
    if (areaFilter) {
      next = next.filter((u) => u.areaName === areaFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      next = next.filter((u) =>
        [u.id, u.name, u.role, u.companyName, u.companyId, u.warehouseName, u.regionName, u.zoneName, u.areaName]
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }
    return next;
  }, [rows, companyId, roleFilter, warehouseFilter, regionFilter, zoneFilter, areaFilter, search]);

  const roleCounts = useMemo(() => {
    const counts = roles.reduce((acc, r) => ({ ...acc, [r]: 0 }), {});
    filtered.forEach((u) => {
      counts[u.role] = (counts[u.role] || 0) + 1;
    });
    return counts;
  }, [filtered]);

  const perPage = 50;
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageRows = filtered.slice((page - 1) * perPage, page * perPage);

  const territoryOptions = useMemo(() => {
    const scoped = roleFilter ? filtered.filter((u) => u.role === roleFilter) : filtered;
    const uniq = (key) => Array.from(new Set(scoped.map((u) => u[key]).filter(Boolean)));
    return {
      warehouses: uniq("warehouseName"),
      regions: uniq("regionName"),
      zones: uniq("zoneName"),
      areas: uniq("areaName"),
    };
  }, [filtered, roleFilter]);

  function resetTerritoryFilters() {
    setWarehouseFilter("");
    setRegionFilter("");
    setZoneFilter("");
    setAreaFilter("");
  }

  function startEdit(row) {
    setEditId(row.id);
    setEditForm({ ...row });
  }

  function onDelete(id) {
    if (!confirm("Delete this user?")) return;
    setRows((s) => s.filter((r) => r.id !== id));
  }

  function onSave() {
    setRows((s) => s.map((r) => (r.id === editId ? editForm : r)));
    setEditId(null);
    setEditForm(null);
  }

  return (
    <AdminShell title="User List" user={null}>
      <div className="rounded-2xl bg-white border shadow-sm p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xl font-semibold text-zinc-900">Users</div>
            <div className="text-sm text-zinc-500 mt-1">Select a company to view and filter users.</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="rounded-xl border px-4 py-2 text-sm hover:bg-zinc-50">Export PDF</button>
            <button className="rounded-xl border px-4 py-2 text-sm hover:bg-zinc-50">Export Excel</button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label>Select Company</Label>
            <select
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              value={companyId}
              onChange={(e) => {
                setCompanyId(e.target.value);
                setPage(1);
                setRoleFilter("");
                resetTerritoryFilters();
              }}
            >
              <option value="">Choose company...</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Search</Label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              placeholder="Search by id, name, role, company..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              disabled={!companyId}
            />
          </div>
          <div>
            <Label>Filter Role</Label>
            <select
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                resetTerritoryFilters();
                setPage(1);
              }}
              disabled={!companyId}
            >
              <option value="">All roles</option>
              {roles.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>

        {selectedCompany ? (
          <div className="mt-4 rounded-xl border bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
            Showing users for <span className="font-medium text-zinc-900">{selectedCompany.name}</span>.
          </div>
        ) : null}

        {!companyId ? (
          <div className="mt-6 rounded-xl border border-dashed px-4 py-6 text-sm text-zinc-500 text-center">
            Please select a company to view user lists.
          </div>
        ) : (
          <>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                className={`rounded-full border px-4 py-2 text-xs ${roleFilter === "" ? "bg-emerald-50 text-emerald-700" : "hover:bg-zinc-50"}`}
                onClick={() => {
                  setRoleFilter("");
                  resetTerritoryFilters();
                  setPage(1);
                }}
              >
                All ({filtered.length})
              </button>
              {roles.map((r) => (
                <button
                  key={r}
                  className={`rounded-full border px-4 py-2 text-xs ${roleFilter === r ? "bg-emerald-50 text-emerald-700" : "hover:bg-zinc-50"}`}
                  onClick={() => {
                    setRoleFilter(r);
                    resetTerritoryFilters();
                    setPage(1);
                  }}
                >
                  {r} ({roleCounts[r] || 0})
                </button>
              ))}
            </div>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <Label>Warehouse</Label>
                <select
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  value={warehouseFilter}
                  onChange={(e) => setWarehouseFilter(e.target.value)}
                >
                  <option value="">All warehouses</option>
                  {territoryOptions.warehouses.map((w) => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Region</Label>
                <select
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  value={regionFilter}
                  onChange={(e) => setRegionFilter(e.target.value)}
                >
                  <option value="">All regions</option>
                  {territoryOptions.regions.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Zone</Label>
                <select
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  value={zoneFilter}
                  onChange={(e) => setZoneFilter(e.target.value)}
                >
                  <option value="">All zones</option>
                  {territoryOptions.zones.map((z) => (
                    <option key={z} value={z}>{z}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Area</Label>
                <select
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  value={areaFilter}
                  onChange={(e) => setAreaFilter(e.target.value)}
                >
                  <option value="">All areas</option>
                  {territoryOptions.areas.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-5 overflow-auto rounded-xl border">
              <table className="min-w-[900px] w-full text-sm">
                <thead className="bg-zinc-50">
                  <tr>
                    <th className="text-left px-3 py-2 border-b">User ID</th>
                    <th className="text-left px-3 py-2 border-b">Name</th>
                    <th className="text-left px-3 py-2 border-b">Role</th>
                    <th className="text-left px-3 py-2 border-b">Company</th>
                    <th className="text-left px-3 py-2 border-b">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.length === 0 ? (
                    <tr><td colSpan={5} className="px-3 py-6 text-center text-zinc-500">No users found</td></tr>
                  ) : (
                    pageRows.map((row) => (
                      <tr key={row.id} className="hover:bg-zinc-50">
                        <td className="px-3 py-2 border-b">{row.id}</td>
                        <td className="px-3 py-2 border-b">{row.name}</td>
                        <td className="px-3 py-2 border-b">{row.role}</td>
                        <td className="px-3 py-2 border-b">{row.companyName}</td>
                        <td className="px-3 py-2 border-b">
                          <div className="flex gap-2">
                            <button
                              onClick={() => startEdit(row)}
                              className="rounded-lg border px-3 py-1.5 text-xs hover:bg-zinc-50"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => onDelete(row.id)}
                              className="rounded-lg border px-3 py-1.5 text-xs hover:bg-zinc-50 text-red-600"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between text-sm text-zinc-600">
              <div>
                Page {page} of {totalPages} (showing up to {perPage} users per page)
              </div>
              <div className="flex gap-2">
                <button
                  className="rounded-lg border px-3 py-1.5 text-xs hover:bg-zinc-50 disabled:opacity-60"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <button
                  className="rounded-lg border px-3 py-1.5 text-xs hover:bg-zinc-50 disabled:opacity-60"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {editId ? (
        <EditCard form={editForm} onChange={setEditForm} onClose={() => setEditId(null)} onSave={onSave} />
      ) : null}
    </AdminShell>
  );
}

function EditCard({ form, onChange, onClose, onSave }) {
  if (!form) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full sm:w-[560px] bg-white shadow-xl flex flex-col">
        <div className="shrink-0 border-b px-4 py-3 flex items-center justify-between">
          <div className="text-lg font-semibold text-zinc-900">Edit User</div>
          <button onClick={onClose} className="rounded-xl border px-3 py-2 text-sm hover:bg-zinc-50">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="User ID" value={form.id} onChange={(v) => onChange((s) => ({ ...s, id: v }))} />
          <Field label="Name" value={form.name} onChange={(v) => onChange((s) => ({ ...s, name: v }))} />
          <Field label="Role" value={form.role} onChange={(v) => onChange((s) => ({ ...s, role: v }))} />
          <Field label="Company" value={form.companyName} onChange={(v) => onChange((s) => ({ ...s, companyName: v }))} />
          <Field label="Warehouse" value={form.warehouseName} onChange={(v) => onChange((s) => ({ ...s, warehouseName: v }))} />
          <Field label="Region" value={form.regionName} onChange={(v) => onChange((s) => ({ ...s, regionName: v }))} />
          <Field label="Zone" value={form.zoneName} onChange={(v) => onChange((s) => ({ ...s, zoneName: v }))} />
          <Field label="Area" value={form.areaName} onChange={(v) => onChange((s) => ({ ...s, areaName: v }))} />
          <Field label="Phone" value={form.phone} onChange={(v) => onChange((s) => ({ ...s, phone: v }))} />
          <Field label="Email" value={form.email} onChange={(v) => onChange((s) => ({ ...s, email: v }))} />
        </div>
        <div className="shrink-0 border-t p-4 flex items-center gap-3">
          <button
            onClick={onSave}
            className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700"
          >
            Update
          </button>
          <button onClick={onClose} className="rounded-xl border px-4 py-2 text-sm hover:bg-zinc-50">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function Label({ children }) {
  return <div className="text-sm font-medium text-zinc-800">{children}</div>;
}

function Field({ label, value, onChange }) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200"
      />
    </div>
  );
}
