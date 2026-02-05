"use client";

import { useEffect, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { apiFetch } from "../../../../lib/api";

export default function VehicleListPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(null);

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const data = await apiFetch("/vehicles");
      setRows(data.vehicles || []);
    } catch (e) {
      setErr(e.message || "Failed to load vehicles");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function startEdit(row) {
    setEditId(row._id);
    setEditForm({ ...row });
  }

  async function onDelete(id) {
    if (!confirm("Delete this vehicle?")) return;
    try {
      await apiFetch(`/vehicles/${id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      alert(e.message || "Delete failed");
    }
  }

  async function onSave() {
    try {
      const data = await apiFetch(`/vehicles/${editId}`, { method: "PUT", body: editForm });
      setRows((s) => s.map((r) => (r._id === editId ? data.vehicle : r)));
      setEditId(null);
      setEditForm(null);
    } catch (e) {
      alert(e.message || "Update failed");
    }
  }

  return (
    <AdminShell title="Vehicle List" user={null}>
      <div className="rounded-2xl bg-white border shadow-sm p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xl font-semibold text-zinc-900">Vehicles</div>
            <div className="text-sm text-zinc-500 mt-1">Manage asset vehicles.</div>
          </div>
          <a
            href="/dashboards/admin/assets/vehicles/add"
            className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700"
          >
            + Add Vehicle
          </a>
        </div>

        {err ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div> : null}

        <div className="mt-5 overflow-auto rounded-xl border">
          <table className="min-w-[760px] w-full text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="text-left px-3 py-2 border-b">Vehicle ID</th>
                <th className="text-left px-3 py-2 border-b">Vehicle Name</th>
                <th className="text-left px-3 py-2 border-b">Type</th>
                <th className="text-left px-3 py-2 border-b">Plate</th>
                <th className="text-left px-3 py-2 border-b">Driver ID</th>
                <th className="text-left px-3 py-2 border-b">Driver Name</th>
                <th className="text-left px-3 py-2 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-zinc-500">Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-zinc-500">No vehicles found</td></tr>
              ) : (
                rows.map((row) => (
                  <tr key={row._id} className="hover:bg-zinc-50">
                    <td className="px-3 py-2 border-b">{row.vehicleId}</td>
                    <td className="px-3 py-2 border-b">{row.name}</td>
                    <td className="px-3 py-2 border-b">{row.type || "-"}</td>
                    <td className="px-3 py-2 border-b">{row.plateNumber || "-"}</td>
                    <td className="px-3 py-2 border-b">{row.driverId || "-"}</td>
                    <td className="px-3 py-2 border-b">{row.driverName || "-"}</td>
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
      <div className="absolute right-0 top-0 h-full w-full sm:w-[520px] bg-white shadow-xl flex flex-col">
        <div className="shrink-0 border-b px-4 py-3 flex items-center justify-between">
          <div className="text-lg font-semibold text-zinc-900">Edit Vehicle</div>
          <button onClick={onClose} className="rounded-xl border px-3 py-2 text-sm hover:bg-zinc-50">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 gap-3">
          <Field label="Vehicle ID" value={form.vehicleId} onChange={(v) => onChange((s) => ({ ...s, vehicleId: v }))} />
          <Field label="Vehicle Name" value={form.name} onChange={(v) => onChange((s) => ({ ...s, name: v }))} />
          <Field label="Vehicle Type" value={form.type} onChange={(v) => onChange((s) => ({ ...s, type: v }))} />
          <Field label="Plate Number" value={form.plateNumber} onChange={(v) => onChange((s) => ({ ...s, plateNumber: v }))} />
          <Field label="Driver ID" value={form.driverId} onChange={(v) => onChange((s) => ({ ...s, driverId: v }))} />
          <Field label="Driver Name" value={form.driverName} onChange={(v) => onChange((s) => ({ ...s, driverName: v }))} />
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
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200"
      />
    </div>
  );
}