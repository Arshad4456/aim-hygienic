"use client";
import { useEffect, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { apiFetch } from "../../../../lib/api";

export default function VehicleManagementListPage() {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState(null);
  async function load() { const r = await apiFetch(`/vehicles?search=${encodeURIComponent(search)}`); setRows(r.vehicles || []); }
  useEffect(() => {
    let active = true;
    (async () => {
      if (!active) return;
      await load();
    })();
    return () => { active = false; };
  }, []);
  return <AdminShell title="Vehicle Management · Vehicle List" user={null}><div className="rounded-2xl bg-white border p-4"><div className="flex gap-2"><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="registration / nickname / make / model" className="border rounded-xl px-3 py-2 text-sm flex-1"/><button onClick={load} className="border rounded-xl px-3">Search</button></div>
  <table className="w-full text-sm mt-3"><thead><tr><th className="text-left">Vehicle</th><th className="text-left">Registration</th><th>Assigned</th><th>Fuel</th><th>Odometer</th><th>Status</th><th/></tr></thead><tbody>{rows.map(v=><tr key={v._id} className="border-t"><td>{v.type} {v.make} {v.model} ({v.year})</td><td>{v.registrationNo}</td><td>{v.assignedUserName||'-'}</td><td>{v.fuelType}</td><td>{v.currentOdometer}</td><td>{v.status}</td><td><button onClick={async()=>setDetail(await apiFetch(`/vehicles/${v._id}/detail`))} className="text-emerald-700">View</button></td></tr>)}</tbody></table></div>
  {detail && <div className="mt-3 rounded-2xl bg-white border p-4"><div className="font-semibold">{detail.vehicle.registrationNo} details</div><div className="text-sm mt-2">Assignments: {detail.assignments.length} · Trips: {detail.trips.length} · Refuels: {detail.refuels.length} · Maintenance: {detail.maintenance.length}</div></div>}</AdminShell>;
}
