"use client";

import { useEffect, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { apiFetch } from "../../../../lib/api";

export default function AddRegionPage() {
  const [warehouses, setWarehouses] = useState([]);
  const [form, setForm] = useState({ regionId: "", name: "", warehouseDocId: "", status: "active" });
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => { apiFetch('/warehouses').then(d=>setWarehouses(d.warehouses||[])).catch(e=>setErr(e.message)); }, []);
  function setField(k,v){setForm(s=>({...s,[k]:v}));}

  async function onSubmit(e){
    e.preventDefault(); setErr(""); setOk("");
    try {
      const w = warehouses.find(x=>x._id===form.warehouseDocId);
      await apiFetch('/regions',{method:'POST',body:{regionId:form.regionId,name:form.name,warehouseId:w?.warehouseId||"",warehouseName:w?.name||"",companyId:w?.companyId||"",companyName:w?.companyName||"",status:form.status}});
      setOk('✅ Region saved successfully.');
      setForm({ regionId: "", name: "", warehouseDocId: "", status: "active" });
    } catch(e2){setErr(e2.message||'Failed to save region');}
  }

  return <AdminShell title="Add Region" user={null}><div className="rounded-2xl bg-white border shadow-sm p-5"><div className="text-xl font-semibold">Add Region</div><div className="text-sm text-zinc-500 mt-1">Each region connects to the selected warehouse.</div>{err?<div className="mt-3 text-sm text-red-600">{err}</div>:null}{ok?<div className="mt-3 text-sm text-emerald-600">{ok}</div>:null}<form onSubmit={onSubmit} className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4"><Field label="Region ID" value={form.regionId} onChange={(v)=>setField('regionId',v)} required/><Field label="Region Name" value={form.name} onChange={(v)=>setField('name',v)} required/><div><Label>Warehouse Name</Label><select required value={form.warehouseDocId} onChange={(e)=>setField('warehouseDocId',e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2"><option value="">Choose warehouse...</option>{warehouses.map((w)=><option key={w._id} value={w._id}>{w.name}</option>)}</select></div><div><Label>Status</Label><select value={form.status} onChange={(e)=>setField('status',e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2"><option value="active">Active</option><option value="inactive">Inactive</option></select></div><div className="md:col-span-2"><button className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm">Save Region</button></div></form></div></AdminShell>;
}
function Label({children}){return <div className="text-sm font-medium text-zinc-800">{children}</div>}
function Field({label,value,onChange,required=false}){return <div><Label>{label}</Label><input required={required} value={value} onChange={(e)=>onChange(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2"/></div>}
