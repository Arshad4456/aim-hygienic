"use client";

import { useEffect, useState } from "react";
import AdminShell from "../components/AdminShell";
import { apiFetch } from "../../../lib/api";
import useCompanyScope from "../components/useCompanyScope";

export default function WarehouseListPage() {
  const { companies, companyDocId, setCompanyDocId, selectedCompany, canSelectCompany } = useCompanyScope();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [edit, setEdit] = useState(null);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const companyParam = selectedCompany?.companyId ? `?companyId=${encodeURIComponent(selectedCompany.companyId)}` : "";
      const data = await apiFetch(`/warehouses${companyParam}`);
      setRows(data.warehouses || []);
    } catch (e) {
      setErr(e.message || "Failed to load warehouses");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, [companyDocId]);

  async function onDelete(id) {
    if (!confirm("Delete this warehouse?")) return;
    try { await apiFetch(`/warehouses/${id}`, { method: "DELETE" }); load(); }
    catch (e) { alert(e.message || "Delete failed"); }
  }

  async function onSave() {
    try {
      await apiFetch(`/warehouses/${edit._id}`, { method: "PUT", body: edit });
      setEdit(null); load();
    } catch (e) { alert(e.message || "Update failed"); }
  }

  return (
    <AdminShell title="Warehouse List" user={null}>
      <div className="rounded-2xl bg-white border shadow-sm p-5">
        <div className="text-xl font-semibold">Warehouses</div>
        <div className="mt-3 max-w-md">
          <div className="text-sm font-medium text-zinc-800">Select Company</div>
          <select className="mt-1 w-full rounded-xl border px-3 py-2 text-sm disabled:bg-zinc-100 disabled:text-zinc-600" value={companyDocId} onChange={(e) => setCompanyDocId(e.target.value)} disabled={!canSelectCompany}>
            <option value="">{canSelectCompany ? "All companies" : "Company selected by role"}</option>
            {companies.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
        </div>
        {err ? <div className="mt-3 text-sm text-red-600">{err}</div> : null}
        <div className="mt-5 overflow-auto rounded-xl border">
          <table className="min-w-[1000px] w-full text-sm">
            <thead className="bg-zinc-50"><tr>
              <th className="text-left px-3 py-2 border-b">ID</th><th className="text-left px-3 py-2 border-b">Name</th><th className="text-left px-3 py-2 border-b">Mobile</th><th className="text-left px-3 py-2 border-b">Phone</th><th className="text-left px-3 py-2 border-b">Capacity</th><th className="text-left px-3 py-2 border-b">Status</th><th className="text-left px-3 py-2 border-b">Address</th><th className="text-left px-3 py-2 border-b">Actions</th>
            </tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={8} className="px-3 py-6 text-center text-zinc-500">Loading...</td></tr> : rows.map((w) => (
                <tr key={w._id} className="hover:bg-zinc-50">
                  <td className="px-3 py-2 border-b">{w.warehouseId}</td>
                  <td className="px-3 py-2 border-b">{w.name}</td>
                  <td className="px-3 py-2 border-b">{w.mobileNumber || "-"}</td>
                  <td className="px-3 py-2 border-b">{w.phoneNumber || w.phone || "-"}</td>
                  <td className="px-3 py-2 border-b">{w.capacity || 0}</td>
                  <td className="px-3 py-2 border-b">{w.status}</td>
                  <td className="px-3 py-2 border-b">{w.address || "-"}</td>
                  <td className="px-3 py-2 border-b"><div className="flex gap-2"><button onClick={() => setEdit({ ...w })} className="rounded-lg border px-3 py-1.5 text-xs">Edit</button><button onClick={() => onDelete(w._id)} className="rounded-lg border px-3 py-1.5 text-xs text-red-600">Delete</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {edit ? <EditModal edit={edit} setEdit={setEdit} onSave={onSave} /> : null}
    </AdminShell>
  );
}

function EditModal({ edit, setEdit, onSave }) {
  return <div className="fixed inset-0 z-50"><div className="absolute inset-0 bg-black/40" onClick={() => setEdit(null)} /><div className="absolute right-0 top-0 h-full w-full sm:w-[560px] bg-white p-4 overflow-y-auto"><div className="text-lg font-semibold">Edit Warehouse</div><div className="mt-3 grid grid-cols-1 gap-3">{["warehouseId","name","mobileNumber","phoneNumber","capacity","address"].map((f)=><input key={f} value={edit[f] || ""} onChange={(e)=>setEdit((s)=>({...s,[f]:e.target.value}))} placeholder={f} className="rounded-xl border px-3 py-2" />)}<select value={edit.status || "active"} onChange={(e)=>setEdit((s)=>({...s,status:e.target.value}))} className="rounded-xl border px-3 py-2"><option value="active">Active</option><option value="inactive">Inactive</option></select></div><div className="mt-4 flex gap-2"><button onClick={onSave} className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm">Update</button><button onClick={()=>setEdit(null)} className="rounded-xl border px-4 py-2 text-sm">Cancel</button></div></div></div>;
}
