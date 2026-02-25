"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { apiFetch } from "../../../../lib/api";

const STATUS_OPTIONS = ["", "Active", "Inactive", "Under Maintenance", "Sold"];

function toDateInput(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export default function VehicleManagementListPage() {
  const [rows, setRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [regions, setRegions] = useState([]);
  const [zones, setZones] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [detailModal, setDetailModal] = useState(null);
  const [editModal, setEditModal] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [filters, setFilters] = useState({
    search: "",
    type: "",
    fuelType: "",
    status: "",
    regionId: "",
    zoneId: "",
    areaId: "",
    assignedUserId: "",
    onlyAssigned: false,
    onlyUnassigned: false,
  });

  const usersMap = useMemo(() => new Map(users.map((u) => [String(u._id), u])), [users]);

  async function load() {
    setError("");
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.search.trim()) params.set("search", filters.search.trim());
      if (filters.type) params.set("type", filters.type);
      if (filters.fuelType) params.set("fuelType", filters.fuelType);
      if (filters.status) params.set("status", filters.status);
      if (filters.regionId) params.set("regionId", filters.regionId);
      if (filters.zoneId) params.set("zoneId", filters.zoneId);
      if (filters.areaId) params.set("areaId", filters.areaId);
      if (filters.assignedUserId) params.set("assignedUserId", filters.assignedUserId);

      const [vehiclesRes, usersRes, regionsRes, zonesRes, areasRes] = await Promise.all([
        apiFetch(`/vehicles${params.toString() ? `?${params.toString()}` : ""}`),
        apiFetch("/users"),
        apiFetch("/regions"),
        apiFetch("/zones"),
        apiFetch("/areas"),
      ]);

      let nextRows = vehiclesRes.vehicles || [];
      if (filters.onlyAssigned) nextRows = nextRows.filter((v) => v.assignedUserId);
      if (filters.onlyUnassigned) nextRows = nextRows.filter((v) => !v.assignedUserId);

      setRows(nextRows);
      setUsers(usersRes.users || []);
      setRegions(regionsRes.regions || []);
      setZones(zonesRes.zones || []);
      setAreas(areasRes.areas || []);
    } catch (e) {
      setError(e.message || "Failed to load vehicles");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const regionOptions = regions;
  const zoneOptions = zones.filter((z) => !filters.regionId || String(z.regionId) === String(filters.regionId) || String(z.regionId) === String(regionOptions.find((x) => x._id === filters.regionId)?.regionId || ""));
  const areaOptions = areas.filter((a) => !filters.zoneId || String(a.zoneId) === String(filters.zoneId) || String(a.zoneId) === String(zoneOptions.find((x) => x._id === filters.zoneId)?.zoneId || ""));

  const userOptions = users.filter((u) => String(u.role || "").toLowerCase() !== "customer");

  function setFilter(key, value) {
    setFilters((s) => {
      if (key === "regionId") return { ...s, regionId: value, zoneId: "", areaId: "" };
      if (key === "zoneId") return { ...s, zoneId: value, areaId: "" };
      if (key === "onlyAssigned" && value) return { ...s, onlyAssigned: true, onlyUnassigned: false };
      if (key === "onlyUnassigned" && value) return { ...s, onlyUnassigned: true, onlyAssigned: false };
      return { ...s, [key]: value };
    });
  }

  async function openDetail(id) {
    try {
      const data = await apiFetch(`/vehicles/${id}/detail`);
      setDetailModal(data);
    } catch (e) {
      setError(e.message || "Failed to load vehicle detail");
    }
  }

  async function onDelete(id) {
    if (!confirm("Delete this vehicle permanently?")) return;
    try {
      await apiFetch(`/vehicles/${id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e.message || "Failed to delete vehicle");
    }
  }

  async function saveEdit() {
    if (!editModal?._id) return;
    setSavingEdit(true);
    setError("");
    try {
      const region = regions.find((r) => r._id === editModal.regionPickId);
      const zone = zones.find((z) => z._id === editModal.zonePickId);
      const area = areas.find((a) => a._id === editModal.areaPickId);
      const assignedUser = users.find((u) => String(u._id) === String(editModal.assignedUserId || ""));

      const payload = {
        ...editModal,
        year: Number(editModal.year || 0),
        currentOdometer: Number(editModal.currentOdometer || 0),
        expectedKmPerLiter: Number(editModal.expectedKmPerLiter || 0),
        tankCapacity: Number(editModal.tankCapacity || 0),
        purchasePrice: Number(editModal.purchasePrice || 0),
        assignmentStartDate: editModal.assignmentStartDate || undefined,
        purchaseDate: editModal.purchaseDate || undefined,
        insuranceExpiry: editModal.insuranceExpiry || undefined,
        tokenExpiry: editModal.tokenExpiry || undefined,
        fitnessExpiry: editModal.fitnessExpiry || undefined,
        permitExpiry: editModal.permitExpiry || undefined,
        regionId: region?.regionId || editModal.regionId,
        regionName: region?.name || editModal.regionName,
        zoneId: zone?.zoneId || editModal.zoneId,
        zoneName: zone?.name || editModal.zoneName,
        areaId: area?.areaId || editModal.areaId,
        areaName: area?.name || editModal.areaName,
        assignedUserName: assignedUser?.fullName || assignedUser?.name || assignedUser?.username || editModal.assignedUserName || "",
      };

      delete payload._id;
      delete payload.createdAt;
      delete payload.updatedAt;
      delete payload.__v;
      delete payload.regionPickId;
      delete payload.zonePickId;
      delete payload.areaPickId;

      await apiFetch(`/vehicles/${editModal._id}`, { method: "PUT", body: payload });
      setEditModal(null);
      await load();
    } catch (e) {
      setError(e.message || "Failed to update vehicle");
    } finally {
      setSavingEdit(false);
    }
  }

  function startEdit(row) {
    const regionPick = regions.find((r) => String(r.regionId) === String(row.regionId));
    const zonePick = zones.find((z) => String(z.zoneId) === String(row.zoneId));
    const areaPick = areas.find((a) => String(a.areaId) === String(row.areaId));
    setEditModal({
      ...row,
      assignmentStartDate: toDateInput(row.assignmentStartDate),
      purchaseDate: toDateInput(row.purchaseDate),
      insuranceExpiry: toDateInput(row.insuranceExpiry),
      tokenExpiry: toDateInput(row.tokenExpiry),
      fitnessExpiry: toDateInput(row.fitnessExpiry),
      permitExpiry: toDateInput(row.permitExpiry),
      regionPickId: regionPick?._id || "",
      zonePickId: zonePick?._id || "",
      areaPickId: areaPick?._id || "",
    });
  }

  return (
    <AdminShell title="Vehicle Management · Vehicle List" user={null}>
      {error ? <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-2 mb-3 text-sm">{error}</div> : null}

      <div className="rounded-2xl bg-white border p-4">
        <div className="text-lg font-semibold">Vehicle List</div>
        <div className="text-sm text-zinc-500 mt-1">Detailed filters, detail view, edit and delete actions.</div>

        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-2 mt-4 text-sm">
          <input value={filters.search} onChange={(e) => setFilter("search", e.target.value)} placeholder="search by reg/make/model/nickname" className="border rounded-xl px-3 py-2" />
          <input value={filters.type} onChange={(e) => setFilter("type", e.target.value)} placeholder="vehicle type" className="border rounded-xl px-3 py-2" />
          <input value={filters.fuelType} onChange={(e) => setFilter("fuelType", e.target.value)} placeholder="fuel type" className="border rounded-xl px-3 py-2" />
          <select value={filters.status} onChange={(e) => setFilter("status", e.target.value)} className="border rounded-xl px-3 py-2">
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s || "All status"}</option>)}
          </select>
          <select value={filters.assignedUserId} onChange={(e) => setFilter("assignedUserId", e.target.value)} className="border rounded-xl px-3 py-2">
            <option value="">All assigned users</option>
            {userOptions.map((u) => <option key={u._id} value={u._id}>{(u.fullName || u.name || u.username) + ` (${u.role || "User"})`}</option>)}
          </select>

          <select value={filters.regionId} onChange={(e) => setFilter("regionId", e.target.value)} className="border rounded-xl px-3 py-2">
            <option value="">All regions</option>
            {regionOptions.map((r) => <option key={r._id} value={r._id}>{r.name}</option>)}
          </select>
          <select value={filters.zoneId} onChange={(e) => setFilter("zoneId", e.target.value)} className="border rounded-xl px-3 py-2">
            <option value="">All zones</option>
            {zoneOptions.map((z) => <option key={z._id} value={z._id}>{z.name}</option>)}
          </select>
          <select value={filters.areaId} onChange={(e) => setFilter("areaId", e.target.value)} className="border rounded-xl px-3 py-2">
            <option value="">All territories</option>
            {areaOptions.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
          </select>
          <label className="flex items-center gap-2 border rounded-xl px-3 py-2"><input type="checkbox" checked={filters.onlyAssigned} onChange={(e) => setFilter("onlyAssigned", e.target.checked)} /> Only assigned</label>
          <label className="flex items-center gap-2 border rounded-xl px-3 py-2"><input type="checkbox" checked={filters.onlyUnassigned} onChange={(e) => setFilter("onlyUnassigned", e.target.checked)} /> Only unassigned</label>
        </div>

        <div className="flex gap-2 mt-3">
          <button onClick={load} className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm">Apply Filters</button>
          <button
            onClick={() => {
              setFilters({ search: "", type: "", fuelType: "", status: "", regionId: "", zoneId: "", areaId: "", assignedUserId: "", onlyAssigned: false, onlyUnassigned: false });
              setTimeout(load, 0);
            }}
            className="rounded-xl border px-4 py-2 text-sm"
          >
            Reset
          </button>
        </div>

        <div className="mt-4 overflow-auto rounded-xl border border-zinc-200">
          <table className="min-w-[1250px] w-full text-sm">
            <thead className="bg-zinc-50 text-zinc-700">
              <tr>
                <th className="px-3 py-2 text-left border-b">Vehicle</th>
                <th className="px-3 py-2 text-left border-b">Registration</th>
                <th className="px-3 py-2 text-left border-b">Assigned</th>
                <th className="px-3 py-2 text-left border-b">Region / Zone / Territory</th>
                <th className="px-3 py-2 text-left border-b">Fuel</th>
                <th className="px-3 py-2 text-left border-b">Odometer</th>
                <th className="px-3 py-2 text-left border-b">Status</th>
                <th className="px-3 py-2 text-left border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-3 py-8 text-center text-zinc-500">Loading vehicles...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={8} className="px-3 py-8 text-center text-zinc-500">No vehicles found.</td></tr>
              ) : rows.map((v) => {
                const assigned = v.assignedUserId ? usersMap.get(String(v.assignedUserId)) : null;
                return (
                  <tr key={v._id} className="odd:bg-white even:bg-zinc-50/40 align-top">
                    <td className="px-3 py-2 border-b">
                      <div className="font-medium text-zinc-900">{v.type} {v.make} {v.model}</div>
                      <div className="text-xs text-zinc-500">{v.year || "-"} · {v.nickname || "No nickname"}</div>
                    </td>
                    <td className="px-3 py-2 border-b">{v.registrationNo}</td>
                    <td className="px-3 py-2 border-b">
                      <div className="font-medium">{v.assignedUserName || "Unassigned"}</div>
                      <div className="text-xs text-zinc-500">{assigned?.role || "-"}</div>
                    </td>
                    <td className="px-3 py-2 border-b text-xs text-zinc-700">{v.regionName || "-"} / {v.zoneName || "-"} / {v.areaName || "-"}</td>
                    <td className="px-3 py-2 border-b">{v.fuelType}</td>
                    <td className="px-3 py-2 border-b">{Number(v.currentOdometer || 0).toLocaleString()} KM</td>
                    <td className="px-3 py-2 border-b">
                      <span className={`px-2 py-1 rounded-full text-xs ${v.status === "Active" ? "bg-emerald-100 text-emerald-700" : v.status === "Under Maintenance" ? "bg-amber-100 text-amber-700" : "bg-zinc-100 text-zinc-700"}`}>{v.status}</span>
                    </td>
                    <td className="px-3 py-2 border-b">
                      <div className="flex flex-wrap gap-2">
                        <button className="px-3 py-1.5 rounded-lg border text-xs" onClick={() => openDetail(v._id)}>View</button>
                        <button className="px-3 py-1.5 rounded-lg border text-xs" onClick={() => startEdit(v)}>Edit</button>
                        <button className="px-3 py-1.5 rounded-lg border text-xs text-rose-700" onClick={() => onDelete(v._id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {detailModal ? <DetailModal detail={detailModal} onClose={() => setDetailModal(null)} usersMap={usersMap} /> : null}
      {editModal ? (
        <EditModal
          value={editModal}
          setValue={setEditModal}
          onClose={() => setEditModal(null)}
          onSave={saveEdit}
          saving={savingEdit}
          users={userOptions}
          regions={regions}
          zones={zones}
          areas={areas}
        />
      ) : null}
    </AdminShell>
  );
}

function DetailModal({ detail, onClose, usersMap }) {
  const v = detail.vehicle || {};
  const assigned = v.assignedUserId ? usersMap.get(String(v.assignedUserId)) : null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl rounded-2xl bg-white shadow-xl border overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <div className="font-semibold text-lg">Vehicle Detail — {v.registrationNo}</div>
            <button onClick={onClose} className="rounded-lg border px-3 py-1.5 text-sm">Close</button>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm max-h-[75vh] overflow-auto">
            <Card title="Identity">
              <Info label="Vehicle" value={`${v.type || "-"} ${v.make || ""} ${v.model || ""}`} />
              <Info label="Year" value={v.year || "-"} />
              <Info label="Registration" value={v.registrationNo || "-"} />
              <Info label="Engine" value={v.engineNo || "-"} />
              <Info label="Chassis" value={v.chassisNo || "-"} />
            </Card>
            <Card title="Assignment & Ops">
              <Info label="Assigned User" value={v.assignedUserName || "Unassigned"} />
              <Info label="Assigned Role" value={assigned?.role || "-"} />
              <Info label="Status" value={v.status || "-"} />
              <Info label="Fuel Type" value={v.fuelType || "-"} />
              <Info label="Current Odometer" value={`${v.currentOdometer || 0} KM`} />
            </Card>
            <Card title="Org Mapping">
              <Info label="Region" value={v.regionName || "-"} />
              <Info label="Zone" value={v.zoneName || "-"} />
              <Info label="Territory" value={v.areaName || "-"} />
            </Card>
            <Card title="Activity Summary">
              <Info label="Assignments" value={detail.assignments?.length || 0} />
              <Info label="Trips" value={detail.trips?.length || 0} />
              <Info label="Refuels" value={detail.refuels?.length || 0} />
              <Info label="Maintenance" value={detail.maintenance?.length || 0} />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditModal({ value, setValue, onClose, onSave, saving, users, regions, zones, areas }) {
  const filteredZones = zones.filter((z) => !value.regionPickId || String(z.regionId) === String(value.regionPickId) || String(z.regionId) === String(regions.find((r) => r._id === value.regionPickId)?.regionId || ""));
  const filteredAreas = areas.filter((a) => !value.zonePickId || String(a.zoneId) === String(value.zonePickId) || String(a.zoneId) === String(filteredZones.find((z) => z._id === value.zonePickId)?.zoneId || ""));

  function setField(key, val) {
    setValue((s) => {
      if (key === "regionPickId") return { ...s, regionPickId: val, zonePickId: "", areaPickId: "" };
      if (key === "zonePickId") return { ...s, zonePickId: val, areaPickId: "" };
      return { ...s, [key]: val };
    });
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl rounded-2xl bg-white shadow-xl border overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <div className="font-semibold text-lg">Edit Vehicle — {value.registrationNo}</div>
            <button onClick={onClose} className="rounded-lg border px-3 py-1.5 text-sm">Close</button>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm max-h-[72vh] overflow-auto">
            <Input label="Type" value={value.type} onChange={(v) => setField("type", v)} />
            <Input label="Make" value={value.make} onChange={(v) => setField("make", v)} />
            <Input label="Model" value={value.model} onChange={(v) => setField("model", v)} />
            <Input label="Year" type="number" value={value.year} onChange={(v) => setField("year", v)} />
            <Input label="Registration" value={value.registrationNo} onChange={(v) => setField("registrationNo", v)} />
            <Input label="Current Odometer" type="number" value={value.currentOdometer} onChange={(v) => setField("currentOdometer", v)} />
            <Input label="Fuel Type" value={value.fuelType} onChange={(v) => setField("fuelType", v)} />
            <Input label="Status" value={value.status} onChange={(v) => setField("status", v)} />
            <Input label="Expected KM/L" type="number" value={value.expectedKmPerLiter} onChange={(v) => setField("expectedKmPerLiter", v)} />

            <Select label="Region" value={value.regionPickId} onChange={(v) => setField("regionPickId", v)} options={regions.map((r) => ({ label: r.name, value: r._id }))} />
            <Select label="Zone" value={value.zonePickId} onChange={(v) => setField("zonePickId", v)} options={filteredZones.map((z) => ({ label: z.name, value: z._id }))} />
            <Select label="Territory" value={value.areaPickId} onChange={(v) => setField("areaPickId", v)} options={filteredAreas.map((a) => ({ label: a.name, value: a._id }))} />

            <Select label="Assigned User" value={value.assignedUserId || ""} onChange={(v) => setField("assignedUserId", v)} options={[{ label: "Unassigned", value: "" }, ...users.map((u) => ({ label: `${u.fullName || u.name || u.username} (${u.role || "User"})`, value: u._id }))]} />
            <Input label="Assignment Start" type="date" value={value.assignmentStartDate || ""} onChange={(v) => setField("assignmentStartDate", v)} />
            <Input label="Notes" value={value.notes || ""} onChange={(v) => setField("notes", v)} />
          </div>
          <div className="px-4 py-3 border-t flex justify-end gap-2">
            <button onClick={onClose} className="rounded-lg border px-4 py-2 text-sm">Cancel</button>
            <button onClick={onSave} disabled={saving} className="rounded-lg bg-emerald-600 text-white px-4 py-2 text-sm disabled:opacity-70">{saving ? "Saving..." : "Save Changes"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div className="rounded-xl border p-3">
      <div className="font-semibold mb-2">{title}</div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b last:border-b-0 pb-1">
      <span className="text-zinc-500">{label}</span>
      <span className="font-medium text-zinc-900 text-right">{value}</span>
    </div>
  );
}

function Input({ label, value, onChange, type = "text" }) {
  return (
    <div>
      <div className="text-xs text-zinc-500 mb-1">{label}</div>
      <input type={type} value={value || ""} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border px-3 py-2" />
    </div>
  );
}

function Select({ label, value, onChange, options = [] }) {
  return (
    <div>
      <div className="text-xs text-zinc-500 mb-1">{label}</div>
      <select value={value || ""} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border px-3 py-2">
        <option value="">Select...</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}