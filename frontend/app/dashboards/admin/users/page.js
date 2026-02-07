"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "../components/AdminShell";
import { apiFetch } from "../../../lib/api";

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
  "Supplier",
];

const fieldLabels = {
  fullName: "Full Name",
  mobile: "Mobile Number",
  role: "Role",
  companyId: "Company ID",
  companyName: "Company Name",
  branchId: "Branch ID",
  branchNameOrNumber: "Branch Name/Number",
  warehouseId: "Warehouse ID",
  warehouseName: "Warehouse Name",
  regionId: "Region ID",
  regionName: "Region Name",
  zoneId: "Zone ID",
  zoneName: "Zone Name",
  areaId: "Area ID",
  areaName: "Area Name",
  shopId: "Shop ID",
  shopName: "Shop Name",
  cnicNo: "CNIC No",
  mobileNumber: "Mobile Number",
  phoneNumber: "Phone Number",
  email: "Email",
  address: "Address",
  shopAddress: "Shop Address",
  gpsLatitude: "GPS Latitude",
  gpsLongitude: "GPS Longitude",
  managerId: "Manager ID",
  managerName: "Manager Name",
  warehouseManagerId: "Warehouse Manager ID",
  warehouseManagerName: "Warehouse Manager Name",
  accountantId: "Accountant ID",
  accountantName: "Accountant Name",
  distributorId: "Distributor ID",
  distributorName: "Distributor Name",
  driverId: "Driver ID",
  driverName: "Driver Name",
  deliveryBoyId: "Delivery Boy ID",
  deliveryBoyName: "Delivery Boy Name",
  salesmanId: "Salesman ID",
  salesmanName: "Salesman Name",
  orderBookerId: "Order Booker ID",
  orderBookerName: "Order Booker Name",
  customerId: "Customer ID",
  customerName: "Customer Name",
  supplierId: "Supplier ID",
  supplierName: "Supplier Name",
  supplierWarehouseId1: "Warehouse 1 ID",
  supplierWarehouseName1: "Warehouse 1 Name",
  supplierWarehouseId2: "Warehouse 2 ID",
  supplierWarehouseName2: "Warehouse 2 Name",
};

const editableFields = [
  "fullName",
  "mobile",
  "role",
  "companyId",
  "companyName",
  "branchId",
  "branchNameOrNumber",
  "warehouseId",
  "warehouseName",
  "regionId",
  "regionName",
  "zoneId",
  "zoneName",
  "areaId",
  "areaName",
  "shopId",
  "shopName",
  "cnicNo",
  "mobileNumber",
  "phoneNumber",
  "email",
  "address",
  "shopAddress",
  "gpsLatitude",
  "gpsLongitude",
  "managerId",
  "managerName",
  "warehouseManagerId",
  "warehouseManagerName",
  "accountantId",
  "accountantName",
  "distributorId",
  "distributorName",
  "driverId",
  "driverName",
  "deliveryBoyId",
  "deliveryBoyName",
  "salesmanId",
  "salesmanName",
  "orderBookerId",
  "orderBookerName",
  "customerId",
  "customerName",
  "supplierId",
  "supplierName",
  "supplierWarehouseId1",
  "supplierWarehouseName1",
  "supplierWarehouseId2",
  "supplierWarehouseName2",
];

function validatePassword(value) {
  if (!value) return "";
  if (value.length < 8) return "Password must be at least 8 characters long.";
  if (!/[A-Z]/.test(value)) return "Password must include at least one capital letter.";
  if (!/[0-9]/.test(value)) return "Password must include at least one number.";
  if (!/[^A-Za-z0-9]/.test(value)) return "Password must include at least one symbol.";
  return "";
}

export default function UserListPage() {
  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [zoneFilter, setZoneFilter] = useState("");
  const [areaFilter, setAreaFilter] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editErr, setEditErr] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const selectedCompany = companies.find((c) => c._id === companyId);

  useEffect(() => {
    async function loadCompanies() {
      try {
        const data = await apiFetch("/companies");
        setCompanies(data.companies || []);
      } catch (e) {
        setErr(e.message || "Failed to load companies");
      } finally {
        setLoading(false);
      }
    }
    loadCompanies();
  }, []);

  useEffect(() => {
    async function loadUsers() {
      if (!companyId) {
        setRows([]);
        return;
      }
      setErr("");
      try {
        const data = await apiFetch(`/users?companyId=${selectedCompany?.companyId || ""}`);
        setRows(data.users || []);
      } catch (e) {
        setErr(e.message || "Failed to load users");
      }
    }
    loadUsers();
  }, [companyId, selectedCompany?.companyId]);

  const filtered = useMemo(() => {
    let next = rows;
    if (roleFilter) next = next.filter((u) => u.role === roleFilter);
    if (warehouseFilter) next = next.filter((u) => u.warehouseName === warehouseFilter);
    if (regionFilter) next = next.filter((u) => u.regionName === regionFilter);
    if (zoneFilter) next = next.filter((u) => u.zoneName === zoneFilter);
    if (areaFilter) next = next.filter((u) => u.areaName === areaFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      next = next.filter((u) =>
        [
          u.fullName,
          u.mobile,
          u.role,
          u.companyName,
          u.companyId,
          u.warehouseName,
          u.regionName,
          u.zoneName,
          u.areaName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }
    return next;
  }, [rows, roleFilter, warehouseFilter, regionFilter, zoneFilter, areaFilter, search]);

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
    setEditId(row._id);
    setEditForm({ ...row, password: "" });
    setEditErr("");
  }

  async function onDelete(id) {
    if (!confirm("Delete this user?")) return;
    try {
      await apiFetch(`/users/${id}`, { method: "DELETE" });
      setRows((s) => s.filter((r) => r._id !== id));
    } catch (e) {
      alert(e.message || "Delete failed");
    }
  }

  async function onSave() {
    if (!editForm) return;
    setEditErr("");
    const passwordError = validatePassword(editForm.password);
    if (passwordError) {
      setEditErr(passwordError);
      return;
    }
    setEditSaving(true);
    try {
      const payload = { ...editForm };
      if (!payload.password) delete payload.password;
      const data = await apiFetch(`/users/${editId}`, { method: "PUT", body: payload });
      setRows((s) => s.map((r) => (r._id === editId ? data.user : r)));
      setEditId(null);
      setEditForm(null);
    } catch (e) {
      setEditErr(e.message || "Update failed");
    } finally {
      setEditSaving(false);
    }
  }

  function exportCsv(filename) {
    const headers = ["User ID", "Name", "Role", "Company", "Mobile", "Email"];
    const lines = filtered.map((u) =>
      [u._id, u.fullName, u.role, u.companyName, u.mobile, u.email]
        .map((v) => `"${String(v || "").replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportPdf() {
    const html = `
      <html>
        <head><title>User List</title></head>
        <body>
          <h2>User List</h2>
          <table border="1" cellpadding="6" cellspacing="0">
            <thead>
              <tr>
                <th>User ID</th><th>Name</th><th>Role</th><th>Company</th><th>Mobile</th><th>Email</th>
              </tr>
            </thead>
            <tbody>
              ${filtered
                .map(
                  (u) => `
                  <tr>
                    <td>${u._id || ""}</td>
                    <td>${u.fullName || ""}</td>
                    <td>${u.role || ""}</td>
                    <td>${u.companyName || ""}</td>
                    <td>${u.mobile || ""}</td>
                    <td>${u.email || ""}</td>
                  </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
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
            <button
              className="rounded-xl border px-4 py-2 text-sm hover:bg-zinc-50"
              onClick={() => exportPdf()}
              disabled={!filtered.length}
            >
              Export PDF
            </button>
            <button
              className="rounded-xl border px-4 py-2 text-sm hover:bg-zinc-50"
              onClick={() => exportCsv("users.xlsx")}
              disabled={!filtered.length}
            >
              Export Excel
            </button>
          </div>
        </div>

        {err ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div> : null}

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
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Search</Label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              placeholder="Search by name, role, company..."
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
                      <tr key={row._id} className="hover:bg-zinc-50">
                        <td className="px-3 py-2 border-b">{row._id}</td>
                        <td className="px-3 py-2 border-b">{row.fullName}</td>
                        <td className="px-3 py-2 border-b">{row.role}</td>
                        <td className="px-3 py-2 border-b">{row.companyName || "-"}</td>
                        <td className="px-3 py-2 border-b">
                          <div className="flex gap-2">
                            <button
                              onClick={() => startEdit(row)}
                              className="rounded-lg border px-3 py-1.5 text-xs hover:bg-zinc-50"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => onDelete(row._id)}
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
        <EditCard
          form={editForm}
          onChange={setEditForm}
          onClose={() => setEditId(null)}
          onSave={onSave}
          saving={editSaving}
          err={editErr}
        />
      ) : null}
    </AdminShell>
  );
}

function EditCard({ form, onChange, onClose, onSave, saving, err }) {
  if (!form) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full sm:w-[620px] bg-white shadow-xl flex flex-col">
        <div className="shrink-0 border-b px-4 py-3 flex items-center justify-between">
          <div className="text-lg font-semibold text-zinc-900">Edit User</div>
          <button onClick={onClose} className="rounded-xl border px-3 py-2 text-sm hover:bg-zinc-50">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {err ? <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div> : null}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {editableFields.map((field) => (
              <Field
                key={field}
                label={fieldLabels[field] || field}
                value={form[field] || ""}
                onChange={(v) => onChange((s) => ({ ...s, [field]: v }))}
              />
            ))}
            <Field
              label="New Password (optional)"
              value={form.password || ""}
              onChange={(v) => onChange((s) => ({ ...s, password: v }))}
              type="password"
              helper="Leave blank to keep existing password."
            />
          </div>
        </div>
        <div className="shrink-0 border-t p-4 flex items-center gap-3">
          <button
            onClick={onSave}
            disabled={saving}
            className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving ? "Updating..." : "Update"}
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

function Field({ label, value, onChange, type = "text", helper }) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200"
      />
      {helper ? <div className="text-xs text-zinc-500 mt-1">{helper}</div> : null}
    </div>
  );
}