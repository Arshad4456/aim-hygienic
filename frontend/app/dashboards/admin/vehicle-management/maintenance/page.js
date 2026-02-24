"use client";
import { useEffect, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { apiFetch } from "../../../../lib/api";

const types = ["oil_change","oil_filter","car_wash","tyre","brake","battery","routine","accidental","other"];
async function uploadProof(file, payload) {
  const signed = await apiFetch('/uploads/vehicle-proof-url', { method: 'POST', body: { ...payload, contentType: file.type } });
  await fetch(signed.uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
  return signed.publicUrl;
}

export default function MaintenancePage() {
  const [vehicles, setVehicles] = useState([]); const [rows,setRows]=useState([]);
  const [form,setForm]=useState({vehicleId:'', date:'', maintenanceType:'oil_change', cost:'', vendor:'', notes:''});
  const [proof,setProof]=useState(null);
  const load=async()=>{const [v,m]=await Promise.all([apiFetch('/vehicles'),apiFetch('/vehicle-management/maintenance')]);setVehicles(v.vehicles||[]);setRows(m.maintenance||[]);};
  useEffect(() => {
    let active = true;
    (async () => {
      if (!active) return;
      await load();
    })();
    return () => { active = false; };
  }, []);
  return <AdminShell title="Vehicle Maintenance" user={null}><div className="rounded-2xl border bg-white p-4"><div className="grid grid-cols-2 gap-2 text-sm"><select value={form.vehicleId} onChange={e=>setForm(s=>({...s,vehicleId:e.target.value}))} className="border rounded-xl px-2 py-2"><option value=''>Vehicle</option>{vehicles.map(v=><option key={v._id} value={v._id}>{v.registrationNo}</option>)}</select><input type='date' value={form.date} onChange={e=>setForm(s=>({...s,date:e.target.value}))} className="border rounded-xl px-2 py-2"/><select value={form.maintenanceType} onChange={e=>setForm(s=>({...s,maintenanceType:e.target.value}))} className="border rounded-xl px-2 py-2">{types.map(t=><option key={t} value={t}>{t}</option>)}</select><input type='number' placeholder='Cost' value={form.cost} onChange={e=>setForm(s=>({...s,cost:e.target.value}))} className="border rounded-xl px-2 py-2"/><input placeholder='Vendor' value={form.vendor} onChange={e=>setForm(s=>({...s,vendor:e.target.value}))} className="border rounded-xl px-2 py-2"/><input placeholder='Notes' value={form.notes} onChange={e=>setForm(s=>({...s,notes:e.target.value}))} className="border rounded-xl px-2 py-2"/><input type='file' accept='image/*' onChange={e=>setProof(e.target.files?.[0])}/><button type='button' onClick={async()=>{let proofUrl=''; if(proof){ proofUrl=await uploadProof(proof,{vehicleId:form.vehicleId, entity:'vehicle-maintenance', recordId:crypto.randomUUID(), slot:'proof', date:form.date}); } await apiFetch('/vehicle-management/maintenance',{method:'POST', body:{...form, cost:Number(form.cost||0), proofUrl}}); await load();}} className="bg-emerald-600 text-white rounded-xl px-3 py-2">Save</button></div></div><div className="rounded-2xl border bg-white p-4 mt-3">{rows.map(r=><div key={r._id} className="text-sm border-t py-1">{new Date(r.date).toLocaleDateString()} · {r.maintenanceType} · PKR {r.cost}</div>)}</div></AdminShell>;
}
