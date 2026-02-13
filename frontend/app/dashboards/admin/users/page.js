"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "../components/AdminShell";
import { apiFetch } from "../../../lib/api";
import { AIM_USER_ROLES, FIELD_LABELS, ROLE_EXTRA_FIELDS, validatePassword } from "./roleConfig";

const BASE_EDIT_FIELDS = ["fullName", "email", "mobileNumber", "cnicNo", "address", "businessType", "businessName"];

export default function UserListPage() {
  const [rows, setRows] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [regions, setRegions] = useState([]);
  const [zones, setZones] = useState([]);
  const [areas, setAreas] = useState([]);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [editUser, setEditUser] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editErr, setEditErr] = useState("");
  const [editShowPassword, setEditShowPassword] = useState(false);

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const [usersRes, warehousesRes, regionsRes, zonesRes, areasRes] = await Promise.all([
        apiFetch("/users"),
        apiFetch("/warehouses"),
        apiFetch("/regions"),
        apiFetch("/zones"),
        apiFetch("/areas"),
      ]);
      setRows(usersRes.users || []);
      setWarehouses(warehousesRes.warehouses || []);
      setRegions(regionsRes.regions || []);
      setZones(zonesRes.zones || []);
      setAreas(areasRes.areas || []);
    } catch (e) {
      setErr(e.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filteredRows = useMemo(() => {
    const value = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (roleFilter && row.role !== roleFilter) return false;
      if (!value) return true;
      const hay = [
        row.userId,
        row.fullName,
        row.role,
        row.mobile,
        row.mobileNumber,
        row.email,
        row.warehouseName,
        row.regionName,
        row.zoneName,
        row.territoryName,
        row.fieldName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(value);
    });
  }, [rows, search, roleFilter]);

  async function onDelete(id) {
    if (!confirm("Delete this user?")) return;
    try {
      await apiFetch(`/users/${id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      alert(e.message || "Failed to delete user");
    }
  }

  function openEdit(user) {
    setEditErr("");
    setEditShowPassword(false);
    setEditUser({ ...user, password: "" });
  }

  function setEditField(key, value) {
    setEditUser((prev) => ({ ...prev, [key]: value }));
  }

  async function onSaveEdit() {
    if (!editUser?._id) return;
    setEditErr("");

    if (editUser.password) {
      const passwordErr = validatePassword(editUser.password);
      if (passwordErr) {
        setEditErr(passwordErr);
        return;
      }
    }

    setEditSaving(true);
    try {
      await apiFetch(`/users/${editUser._id}`, {
        method: "PUT",
        body: {
          ...editUser,
          mobile: editUser.mobileNumber || editUser.mobile,
        },
      });
      setEditUser(null);
      await load();
    } catch (e) {
      setEditErr(e.message || "Failed to update user");
    } finally {
      setEditSaving(false);
    }
  }

  return (
    <AdminShell title="User List" user={null}>
      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="text-xl font-semibold text-zinc-900">Users</div>
        <div className="mt-1 text-sm text-zinc-500">All users list with role-based details and edit support.</div>

        {err ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div> : null}

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users..."
            className="rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-200"
          >
            <option value="">All roles</option>
            {AIM_USER_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <div className="rounded-xl border bg-zinc-50 px-3 py-2 text-sm text-zinc-600">Total users: <b>{filteredRows.length}</b></div>
        </div>

        <div className="mt-5 overflow-auto rounded-xl border">
          <table className="min-w-[1100px] w-full text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="border-b px-3 py-2 text-left">User ID</th>
                <th className="border-b px-3 py-2 text-left">Name</th>
                <th className="border-b px-3 py-2 text-left">Role</th>
                <th className="border-b px-3 py-2 text-left">Mobile</th>
                <th className="border-b px-3 py-2 text-left">Warehouse</th>
                <th className="border-b px-3 py-2 text-left">Region</th>
                <th className="border-b px-3 py-2 text-left">Zone</th>
                <th className="border-b px-3 py-2 text-left">Territory</th>
                <th className="border-b px-3 py-2 text-left">Field</th>
                <th className="border-b px-3 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="px-3 py-6 text-center text-zinc-500">Loading...</td></tr>
              ) : filteredRows.length === 0 ? (
                <tr><td colSpan={10} className="px-3 py-6 text-center text-zinc-500">No users found</td></tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row._id} className="hover:bg-zinc-50">
                    <td className="border-b px-3 py-2">{row.userId || "-"}</td>
                    <td className="border-b px-3 py-2">{row.fullName || "-"}</td>
                    <td className="border-b px-3 py-2">{row.role || "-"}</td>
                    <td className="border-b px-3 py-2">{row.mobileNumber || row.mobile || "-"}</td>
                    <td className="border-b px-3 py-2">{row.warehouseName || "-"}</td>
                    <td className="border-b px-3 py-2">{row.regionName || "-"}</td>
                    <td className="border-b px-3 py-2">{row.zoneName || "-"}</td>
                    <td className="border-b px-3 py-2">{row.territoryName || "-"}</td>
                    <td className="border-b px-3 py-2">{row.fieldName || "-"}</td>
                    <td className="border-b px-3 py-2">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(row)} className="rounded-lg border px-3 py-1.5 text-xs hover:bg-zinc-50">Edit</button>
                        <button onClick={() => onDelete(row._id)} className="rounded-lg border px-3 py-1.5 text-xs text-red-600 hover:bg-zinc-50">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editUser ? (
        <EditUserModal
          user={editUser}
          setField={setEditField}
          onClose={() => setEditUser(null)}
          onSave={onSaveEdit}
          saving={editSaving}
          error={editErr}
          warehouses={warehouses}
          regions={regions}
          zones={zones}
          areas={areas}
          showPassword={editShowPassword}
          setShowPassword={setEditShowPassword}
        />
      ) : null}
    </AdminShell>
  );
}

function EditUserModal({
  user,
  setField,
  onClose,
  onSave,
  saving,
  error,
  warehouses,
  regions,
  zones,
  areas,
  showPassword,
  setShowPassword,
}) {
  const roleNeeds = ROLE_EXTRA_FIELDS[user.role] || [];

  const selectedWarehouse = warehouses.find((x) => x.warehouseId === user.warehouseId);
  const selectedRegion = regions.find((x) => x.regionId === user.regionId);
  const selectedZone = zones.find((x) => x.zoneId === user.zoneId);

  const filteredRegions = regions.filter((r) => {
    if (!selectedWarehouse) return true;
    return !r.companyId || r.companyId === selectedWarehouse.companyId;
  });
  const filteredZones = zones.filter((z) => {
    if (selectedWarehouse && z.warehouseId !== selectedWarehouse.warehouseId) return false;
    if (selectedRegion && z.regionId !== selectedRegion.regionId) return false;
    return true;
  });
  const filteredAreas = areas.filter((a) => {
    if (selectedWarehouse && a.warehouseId !== selectedWarehouse.warehouseId) return false;
    if (selectedRegion && a.regionId !== selectedRegion.regionId) return false;
    if (selectedZone && a.zoneId !== selectedZone.zoneId) return false;
    return true;
  });

  const visibleTextFields = BASE_EDIT_FIELDS.filter((f) => !!user[f] || ["fullName", "mobileNumber", "cnicNo", "email", "address"].includes(f));

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 flex h-full w-full flex-col bg-white shadow-xl sm:w-[680px]">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="text-lg font-semibold text-zinc-900">Edit User</div>
          <button onClick={onClose} className="rounded-xl border px-3 py-2 text-sm hover:bg-zinc-50">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {error ? <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <InputField label="User ID" value={user.userId || ""} readOnly />
            <InputField label="Role" value={user.role || ""} readOnly />

            {roleNeeds.includes("warehouse") ? (
              <SelectField
                label="Warehouse Name"
                value={user.warehouseId || ""}
                onChange={(warehouseId) => {
                  const item = warehouses.find((w) => w.warehouseId === warehouseId);
                  setField("warehouseId", item?.warehouseId || "");
                  setField("warehouseName", item?.name || "");
                  setField("regionId", "");
                  setField("regionName", "");
                  setField("zoneId", "");
                  setField("zoneName", "");
                  setField("territoryId", "");
                  setField("territoryName", "");
                  setField("fieldId", "");
                  setField("fieldName", "");
                }}
                options={warehouses.map((w) => ({ value: w.warehouseId, label: w.name }))}
              />
            ) : null}

            {roleNeeds.includes("region") ? (
              <SelectField
                label="Region Name"
                value={user.regionId || ""}
                onChange={(regionId) => {
                  const item = regions.find((r) => r.regionId === regionId);
                  setField("regionId", item?.regionId || "");
                  setField("regionName", item?.name || "");
                  setField("zoneId", "");
                  setField("zoneName", "");
                  setField("territoryId", "");
                  setField("territoryName", "");
                  setField("fieldId", "");
                  setField("fieldName", "");
                }}
                options={filteredRegions.map((r) => ({ value: r.regionId, label: r.name }))}
              />
            ) : null}

            {roleNeeds.includes("zone") ? (
              <SelectField
                label="Zone Name"
                value={user.zoneId || ""}
                onChange={(zoneId) => {
                  const item = zones.find((z) => z.zoneId === zoneId);
                  setField("zoneId", item?.zoneId || "");
                  setField("zoneName", item?.name || "");
                  setField("territoryId", "");
                  setField("territoryName", "");
                  setField("fieldId", "");
                  setField("fieldName", "");
                }}
                options={filteredZones.map((z) => ({ value: z.zoneId, label: z.name }))}
              />
            ) : null}

            {roleNeeds.includes("territory") ? (
              <SelectField
                label="Territory Name"
                value={user.territoryId || ""}
                onChange={(areaId) => {
                  const item = areas.find((a) => a.areaId === areaId);
                  setField("territoryId", item?.areaId || "");
                  setField("territoryName", item?.name || "");
                }}
                options={filteredAreas.map((a) => ({ value: a.areaId, label: a.name }))}
              />
            ) : null}

            {roleNeeds.includes("field") ? (
              <SelectField
                label="Field Name"
                value={user.fieldId || ""}
                onChange={(areaId) => {
                  const item = areas.find((a) => a.areaId === areaId);
                  setField("fieldId", item?.areaId || "");
                  setField("fieldName", item?.name || "");
                }}
                options={filteredAreas.map((a) => ({ value: a.areaId, label: a.name }))}
              />
            ) : null}

            {visibleTextFields.map((field) => (
              <InputField
                key={field}
                label={FIELD_LABELS[field] || field}
                value={user[field] || ""}
                onChange={(v) => setField(field, v)}
              />
            ))}

            <PasswordField
              label="New Password (optional)"
              value={user.password || ""}
              onChange={(v) => setField("password", v)}
              show={showPassword}
              setShow={setShowPassword}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 border-t p-4">
          <button onClick={onSave} disabled={saving} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60">
            {saving ? "Updating..." : "Update User"}
          </button>
          <button onClick={onClose} className="rounded-xl border px-4 py-2 text-sm hover:bg-zinc-50">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function Label({ children }) {
  return <div className="text-sm font-medium text-zinc-800">{children}</div>;
}

function InputField({ label, value, onChange, readOnly = false }) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange?.(e.target.value)}
        className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200"
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div>
      <Label>{label}</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200"
      >
        <option value="">Choose...</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

function PasswordField({ label, value, onChange, show, setShow }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full rounded-xl border px-3 py-2 pr-16 outline-none focus:ring-2 focus:ring-emerald-200"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-zinc-700"
        >
          {show ? "Hide" : "Show"}
        </button>
      </div>
    </div>
  );
}