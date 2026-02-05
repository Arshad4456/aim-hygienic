"use client";

import { useEffect, useState } from "react";
import AdminShell from "../components/AdminShell";
import { apiFetch } from "../../../lib/api";

export default function AreaListPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(null);

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const data = await apiFetch("/areas");
      setRows(data.areas || []);
    } catch (e) {
      setErr(e.message || "Failed to load areas");
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
    if (!confirm("Delete this area?")) return;
    try {
      await apiFetch(`/areas/${id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      alert(e.message || "Delete failed");
    }
  }

  async function onSave() {
    try {
      const data = await apiFetch(`/areas/${editId}`, { method: "PUT", body: editForm });
      setRows((s) => s.map((r) => (r._id === editId ? data.area : r)));
      setEditId(null);
      setEditForm(null);
    } catch (e) {
      alert(e.message || "Update failed");
    }
  }

  return (
    <AdminShell title="Area List" user={null}>
      <div className="rounded-2xl bg-white border shadow-sm p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xl font-semibold text-zinc-900">Areas</div>
            <div className="text-sm text-zinc-500 mt-1">Manage area records.</div>
          </div>
          <a
            href="/dashboards/admin/areas/add"
            className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700"
          >
            + Add Area
          </a>
        </div>

        {err ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div> : null}

        <div className="mt-5 overflow-auto rounded-xl border">
          <table className="min-w-[760px] w-full text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="text-left px-3 py-2 border-b">Area ID</th>
                <th className="text-left px-3 py-2 border-b">Area Name</th>
                <th className="text-left px-3 py-2 border-b">Region</th>
                <th className="text-left px-3 py-2 border-b">Zone</th>
                <th className="text-left px-3 py-2 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-zinc-500">Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-zinc-500">No areas found</td></tr>
              ) : (
                rows.map((row) => (
                  <tr key={row._id} className="hover:bg-zinc-50">
                    <td className="px-3 py-2 border-b">{row.areaId}</td>
                    <td className="px-3 py-2 border-b">{row.name}</td>
                    <td className="px-3 py-2 border-b">{row.regionName}</td>
                    <td className="px-3 py-2 border-b">{row.zoneName}</td>
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
          <div className="text-lg font-semibold text-zinc-900">Edit Area</div>
          <button onClick={onClose} className="rounded-xl border px-3 py-2 text-sm hover:bg-zinc-50">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 gap-3">
          <Field label="Area ID" value={form.areaId} onChange={(v) => onChange((s) => ({ ...s, areaId: v }))} />
          <Field label="Area Name" value={form.name} onChange={(v) => onChange((s) => ({ ...s, name: v }))} />
          <Field label="Region ID" value={form.regionId} onChange={(v) => onChange((s) => ({ ...s, regionId: v }))} />
          <Field label="Region Name" value={form.regionName} onChange={(v) => onChange((s) => ({ ...s, regionName: v }))} />
          <Field label="Zone ID" value={form.zoneId} onChange={(v) => onChange((s) => ({ ...s, zoneId: v }))} />
          <Field label="Zone Name" value={form.zoneName} onChange={(v) => onChange((s) => ({ ...s, zoneName: v }))} />
          <Field label="GPS Latitude" value={form.gpsLatitude} onChange={(v) => onChange((s) => ({ ...s, gpsLatitude: v }))} />
          <Field label="GPS Longitude" value={form.gpsLongitude} onChange={(v) => onChange((s) => ({ ...s, gpsLongitude: v }))} />
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