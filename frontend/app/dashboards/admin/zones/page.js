"use client";

import { useEffect, useState } from "react";
import AdminShell from "../components/AdminShell";
import { apiFetch } from "../../../lib/api";

export default function ZoneListPage() {
  const [rows, setRows] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [regions, setRegions] = useState([]);
  const [companyId, setCompanyId] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(null);

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const [zonesRes, companiesRes, warehousesRes, regionsRes] = await Promise.all([
        apiFetch("/zones"),
        apiFetch("/companies"),
        apiFetch("/warehouses"),
        apiFetch("/regions"),
      ]);
      setRows(zonesRes.zones || []);
      setCompanies(companiesRes.companies || []);
      setWarehouses(warehousesRes.warehouses || []);
      setRegions(regionsRes.regions || []);
    } catch (e) {
      setErr(e.message || "Failed to load zones");
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
    if (!confirm("Delete this zone?")) return;
    try {
      await apiFetch(`/zones/${id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      alert(e.message || "Delete failed");
    }
  }

  async function onSave() {
    try {
      const data = await apiFetch(`/zones/${editId}`, { method: "PUT", body: editForm });
      setRows((s) => s.map((r) => (r._id === editId ? data.zone : r)));
      setEditId(null);
      setEditForm(null);
    } catch (e) {
      alert(e.message || "Update failed");
    }
  }

  const filteredRows = rows.filter((row) => {
    if (warehouseFilter && row.warehouseName !== warehouseFilter) return false;
    if (regionFilter && row.regionName !== regionFilter) return false;
    if (companyId) {
      const wh = warehouses.find((w) => w.warehouseId === row.warehouseId);
      if (!wh || wh.companyId !== companyId) return false;
    }
    return true;
  });

  return (
    <AdminShell title="Zone List" user={null}>
      <div className="rounded-2xl bg-white border shadow-sm p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xl font-semibold text-zinc-900">Zones</div>
            <div className="text-sm text-zinc-500 mt-1">Manage zone records.</div>
          </div>
          <a
            href="/dashboards/admin/zones/add"
            className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700"
          >
            + Add Zone
          </a>
        </div>

        {err ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div> : null}

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label>Company</Label>
            <select
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
            >
              <option value="">All companies</option>
              {companies.map((c) => (
                <option key={c._id} value={c.companyId}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Warehouse</Label>
            <select
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              value={warehouseFilter}
              onChange={(e) => setWarehouseFilter(e.target.value)}
            >
              <option value="">All warehouses</option>
              {warehouses.map((w) => (
                <option key={w._id} value={w.name}>{w.name}</option>
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
              {regions.map((r) => (
                <option key={r._id} value={r.name}>{r.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 overflow-auto rounded-xl border">
          <table className="min-w-[720px] w-full text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="text-left px-3 py-2 border-b">Zone ID</th>
                <th className="text-left px-3 py-2 border-b">Zone Name</th>
                <th className="text-left px-3 py-2 border-b">Warehouse</th>
                <th className="text-left px-3 py-2 border-b">Region</th>
                <th className="text-left px-3 py-2 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-zinc-500">Loading...</td></tr>
              ) : filteredRows.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-zinc-500">No zones found</td></tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row._id} className="hover:bg-zinc-50">
                    <td className="px-3 py-2 border-b">{row.zoneId}</td>
                    <td className="px-3 py-2 border-b">{row.name}</td>
                    <td className="px-3 py-2 border-b">{row.warehouseName || "-"}</td>
                    <td className="px-3 py-2 border-b">{row.regionName}</td>
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
          <div className="text-lg font-semibold text-zinc-900">Edit Zone</div>
          <button onClick={onClose} className="rounded-xl border px-3 py-2 text-sm hover:bg-zinc-50">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 gap-3">
          <Field label="Zone ID" value={form.zoneId} onChange={(v) => onChange((s) => ({ ...s, zoneId: v }))} />
          <Field label="Zone Name" value={form.name} onChange={(v) => onChange((s) => ({ ...s, name: v }))} />
          <Field label="Warehouse ID" value={form.warehouseId} onChange={(v) => onChange((s) => ({ ...s, warehouseId: v }))} />
          <Field label="Warehouse Name" value={form.warehouseName} onChange={(v) => onChange((s) => ({ ...s, warehouseName: v }))} />
          <Field label="Region ID" value={form.regionId} onChange={(v) => onChange((s) => ({ ...s, regionId: v }))} />
          <Field label="Region Name" value={form.regionName} onChange={(v) => onChange((s) => ({ ...s, regionName: v }))} />
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