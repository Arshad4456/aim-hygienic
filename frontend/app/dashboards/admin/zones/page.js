"use client";

import { useCallback, useEffect, useState } from "react";
import AdminShell from "../components/AdminShell";
import { apiFetch } from "../../../lib/api";

const LIMIT = 50;

export default function ZoneListPage() {
  const [rows, setRows] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState(null);
  const [search, setSearch] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [regionId, setRegionId] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (search.trim()) params.set("search", search.trim());
    if (warehouseId) params.set("warehouseId", warehouseId);
    if (regionId) params.set("regionId", regionId);
    const d = await apiFetch(`/zones?${params.toString()}`);
    setRows(d.zones || []);
    setTotalPages(d.pagination?.totalPages || 1);
    setLoading(false);
  }, [page, search, warehouseId, regionId]);

  useEffect(() => {
    Promise.all([apiFetch("/warehouses"), apiFetch("/regions")]).then(([w, r]) => {
      setWarehouses(w.warehouses || []);
      setRegions(r.regions || []);
    });
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function save() { await apiFetch(`/zones/${edit._id}`, { method: "PUT", body: edit }); setEdit(null); load(); }
  async function del(id) { if (!confirm("Delete zone?")) return; await apiFetch(`/zones/${id}`, { method: "DELETE" }); load(); }

  return <AdminShell title="Zone List" user={null}><div className="rounded-2xl bg-white border shadow-sm p-5"><div className="text-xl font-semibold">Zones</div>
    <div className="mt-4 grid gap-3 md:grid-cols-4"><input value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} placeholder="Search by ID, name, warehouse or region" className="rounded-xl border px-3 py-2" /><select value={warehouseId} onChange={(e) => { setPage(1); setWarehouseId(e.target.value); }} className="rounded-xl border px-3 py-2"><option value="">All Warehouses</option>{warehouses.map((w) => <option key={w._id} value={w.warehouseId}>{w.name}</option>)}</select><select value={regionId} onChange={(e) => { setPage(1); setRegionId(e.target.value); }} className="rounded-xl border px-3 py-2"><option value="">All Regions</option>{regions.map((r) => <option key={r._id} value={r.regionId}>{r.name}</option>)}</select></div>
    <div className="mt-5 overflow-auto rounded-xl border"><table className="min-w-[1000px] w-full text-sm"><thead className="bg-zinc-50"><tr><th className="px-3 py-2 border-b text-left">ID</th><th className="px-3 py-2 border-b text-left">Name</th><th className="px-3 py-2 border-b text-left">Warehouse</th><th className="px-3 py-2 border-b text-left">Region</th><th className="px-3 py-2 border-b text-left">Status</th><th className="px-3 py-2 border-b text-left">Actions</th></tr></thead><tbody>{loading ? <tr><td colSpan={6} className="px-3 py-6 text-center">Loading...</td></tr> : rows.map((r) => <tr key={r._id}><td className="px-3 py-2 border-b">{r.zoneId}</td><td className="px-3 py-2 border-b">{r.name}</td><td className="px-3 py-2 border-b">{r.warehouseName || "-"}</td><td className="px-3 py-2 border-b">{r.regionName || "-"}</td><td className="px-3 py-2 border-b">{r.status || "active"}</td><td className="px-3 py-2 border-b"><button className="rounded-lg border px-3 py-1 text-xs mr-2" onClick={() => setEdit({ ...r })}>Edit</button><button className="rounded-lg border px-3 py-1 text-xs text-red-600" onClick={() => del(r._id)}>Delete</button></td></tr>)}</tbody></table></div>
    <Pager page={page} totalPages={totalPages} onChange={setPage} /></div>{edit ? <Modal edit={edit} setEdit={setEdit} onSave={save} /> : null}</AdminShell>;
}

function Pager({ page, totalPages, onChange }) { return <div className="mt-4 flex items-center justify-end gap-2 text-sm"><button disabled={page <= 1} onClick={() => onChange(page - 1)} className="rounded-lg border px-3 py-1 disabled:opacity-50">Prev</button><span>Page {page} of {totalPages}</span><button disabled={page >= totalPages} onClick={() => onChange(page + 1)} className="rounded-lg border px-3 py-1 disabled:opacity-50">Next</button></div>; }

function Modal({ edit, setEdit, onSave }) { return <div className="fixed inset-0 z-50"><div className="absolute inset-0 bg-black/40" onClick={() => setEdit(null)} /><div className="absolute right-0 top-0 h-full w-full sm:w-[520px] bg-white p-4"><div className="text-lg font-semibold">Edit Zone</div><div className="mt-3 grid gap-3">{["zoneId", "name", "warehouseName", "regionName"].map((f) => <input key={f} value={edit[f] || ""} onChange={(e) => setEdit((s) => ({ ...s, [f]: e.target.value }))} placeholder={f} className="rounded-xl border px-3 py-2" />)}<select value={edit.status || "active"} onChange={(e) => setEdit((s) => ({ ...s, status: e.target.value }))} className="rounded-xl border px-3 py-2"><option value="active">Active</option><option value="inactive">Inactive</option></select></div><div className="mt-4 flex gap-2"><button onClick={onSave} className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm">Update</button><button onClick={() => setEdit(null)} className="rounded-xl border px-4 py-2 text-sm">Cancel</button></div></div></div>; }
