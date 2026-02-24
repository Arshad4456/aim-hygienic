"use client";
import { useEffect, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { apiFetch } from "../../../../lib/api";

async function uploadProof(file, payload) {
  const signed = await apiFetch('/uploads/vehicle-proof-url', { method: 'POST', body: { ...payload, contentType: file.type } });
  await fetch(signed.uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
  return signed.publicUrl;
}

export default function FuelManagementPage() {
  const [vehicles, setVehicles] = useState([]); const [trips, setTrips] = useState([]);
  const [form, setForm] = useState({ vehicleId:'', tripType:'company', tripDate:'', fromPlace:'', toPlace:'', startOdometer:'', endOdometer:'', liters:'' });
  const [startFile, setStartFile] = useState(null); const [endFile, setEndFile] = useState(null);
  const [refuel, setRefuel] = useState({ vehicleId:'', date:'', liters:'', cost:'', vendor:'' }); const [receipt, setReceipt] = useState(null);
  const load = async()=>{ const [v,t]=await Promise.all([apiFetch('/vehicles'), apiFetch('/vehicle-management/trips')]); setVehicles(v.vehicles||[]); setTrips(t.trips||[]); };
  useEffect(() => {
    let active = true;
    (async () => {
      if (!active) return;
      await load();
    })();
    return () => { active = false; };
  }, []);
  return <AdminShell title="Fuel Management" user={null}><div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
    <div className="rounded-2xl border bg-white p-4"><div className="font-semibold">Trip Entry</div><TripForm vehicles={vehicles} form={form} setForm={setForm} setStartFile={setStartFile} setEndFile={setEndFile} onSubmit={async()=>{
      const vehicleId=form.vehicleId; const tripId=crypto.randomUUID();
      const startMeterUrl = await uploadProof(startFile,{vehicleId, entity:'fuel', recordId:tripId, slot:'start', date:form.tripDate});
      const endMeterUrl = await uploadProof(endFile,{vehicleId, entity:'fuel', recordId:tripId, slot:'end', date:form.tripDate});
      await apiFetch('/vehicle-management/trips',{method:'POST', body:{...form, startMeterUrl, endMeterUrl, liters:Number(form.liters||0)}}); await load();
    }} /></div>
    <div className="rounded-2xl border bg-white p-4"><div className="font-semibold">Refuel Entry</div><RefuelForm vehicles={vehicles} form={refuel} setForm={setRefuel} setReceipt={setReceipt} onSubmit={async()=>{
      const refuelId=crypto.randomUUID(); const receiptUrl = await uploadProof(receipt,{vehicleId:refuel.vehicleId, entity:'fuel', recordId:refuelId, slot:'receipt', date:refuel.date});
      await apiFetch('/vehicle-management/refuels',{method:'POST', body:{...refuel, liters:Number(refuel.liters||0), cost:Number(refuel.cost||0), receiptUrl}});
    }} /></div>
  </div><div className="rounded-2xl border bg-white p-4 mt-3"><div className="font-semibold mb-2">Recent Trips</div>{trips.map(t=><div key={t._id} className="text-sm border-t py-1">{new Date(t.tripDate).toLocaleDateString()} · {t.tripType} · {t.distance} KM · {t.fromPlace} → {t.toPlace}</div>)}</div></AdminShell>;
}
function TripForm({ vehicles, form, setForm, setStartFile, setEndFile, onSubmit }) { const s=(k,v)=>setForm((x)=>({...x,[k]:v})); return <div className="grid grid-cols-2 gap-2 text-sm"><select value={form.vehicleId} onChange={e=>s('vehicleId',e.target.value)} className="border rounded-xl px-2 py-2"><option value=''>Vehicle</option>{vehicles.map(v=><option key={v._id} value={v._id}>{v.registrationNo}</option>)}</select><input type='date' value={form.tripDate} onChange={e=>s('tripDate',e.target.value)} className="border rounded-xl px-2 py-2"/><input placeholder='From' value={form.fromPlace} onChange={e=>s('fromPlace',e.target.value)} className="border rounded-xl px-2 py-2"/><input placeholder='To' value={form.toPlace} onChange={e=>s('toPlace',e.target.value)} className="border rounded-xl px-2 py-2"/><input placeholder='Start Odometer' type='number' value={form.startOdometer} onChange={e=>s('startOdometer',e.target.value)} className="border rounded-xl px-2 py-2"/><input placeholder='End Odometer' type='number' value={form.endOdometer} onChange={e=>s('endOdometer',e.target.value)} className="border rounded-xl px-2 py-2"/><input type='file' accept='image/*' onChange={e=>setStartFile(e.target.files?.[0])} /><input type='file' accept='image/*' onChange={e=>setEndFile(e.target.files?.[0])} /><button type='button' onClick={onSubmit} className="col-span-2 bg-emerald-600 text-white rounded-xl px-3 py-2">Save Trip</button></div>; }
function RefuelForm({ vehicles, form, setForm, setReceipt, onSubmit }) { const s=(k,v)=>setForm((x)=>({...x,[k]:v})); return <div className="grid grid-cols-2 gap-2 text-sm"><select value={form.vehicleId} onChange={e=>s('vehicleId',e.target.value)} className="border rounded-xl px-2 py-2"><option value=''>Vehicle</option>{vehicles.map(v=><option key={v._id} value={v._id}>{v.registrationNo}</option>)}</select><input type='date' value={form.date} onChange={e=>s('date',e.target.value)} className="border rounded-xl px-2 py-2"/><input placeholder='Liters' type='number' value={form.liters} onChange={e=>s('liters',e.target.value)} className="border rounded-xl px-2 py-2"/><input placeholder='Cost' type='number' value={form.cost} onChange={e=>s('cost',e.target.value)} className="border rounded-xl px-2 py-2"/><input placeholder='Vendor' value={form.vendor} onChange={e=>s('vendor',e.target.value)} className="border rounded-xl px-2 py-2"/><input type='file' accept='image/*' onChange={e=>setReceipt(e.target.files?.[0])}/><button type='button' onClick={onSubmit} className="col-span-2 bg-emerald-600 text-white rounded-xl px-3 py-2">Save Refuel</button></div>; }
