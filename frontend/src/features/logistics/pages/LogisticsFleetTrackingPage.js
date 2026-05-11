"use client";
import { useEffect, useState } from "react";
import logisticsService from "../../../services/logisticsService";

function money(value) { return `PKR ${Number(value || 0).toLocaleString()}`; }
function statusBadge(status) {
  const s = String(status || "draft");
  const cls = s === "posted" || s === "delivered" ? "bg-emerald-50 text-emerald-700" : s === "draft" || s === "pending" ? "bg-slate-100 text-slate-700" : "bg-blue-50 text-blue-700";
  return <span className={`rounded-full px-3 py-1 text-xs font-black ${cls}`}>{s}</span>;
}

export default function LogisticsFleetTrackingPage({ mode = "logistics" }) {
  const [tab, setTab] = useState(mode === "fleet" ? "fleet" : mode === "deliveries" ? "deliveries" : mode === "live-tracking" ? "tracking" : "overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState({ kpis: {}, vehicles: [], primaryDispatches: [], secondaryDeliveries: [], deliveryUsers: [], maintenance: [], trips: [] });

  async function load() {
    setLoading(true); setError("");
    try { setData(await logisticsService.overview().then((res) => res.overview || res)); }
    catch (e) { setError(e.message || "Unable to load logistics data"); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const tabs = [["overview", "Overview"], ["dispatches", "Dispatches"], ["deliveries", "Deliveries"], ["fleet", "Fleet"], ["tracking", "Live Tracking"]];

  return <div className="space-y-6">
    <div className="rounded-[2rem] bg-gradient-to-r from-slate-950 via-cyan-700 to-emerald-500 p-6 text-white shadow-lg">
      <p className="text-xs font-black uppercase tracking-[0.35em] text-cyan-100">Phase 9 Logistics</p>
      <h2 className="mt-2 text-3xl font-black">Fleet, Delivery & Live Tracking</h2>
      <p className="mt-2 max-w-4xl text-sm text-cyan-50">Connect warehouse dispatches, delivery users, vehicles, route tracking, and mobile role operations.</p>
    </div>

    <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
      <b>Correct flow:</b> dispatch is operational movement, finance is separate. Primary invoice is paid by distributor in Company Finance. Customer invoice is received by distributor in Distributor Finance.
    </div>

    <div className="flex flex-wrap gap-2">
      {tabs.map(([key, label]) => <button key={key} onClick={() => setTab(key)} className={`rounded-full px-4 py-2 text-sm font-bold ${tab === key ? "bg-slate-950 text-white" : "bg-white text-slate-600 shadow-sm ring-1 ring-slate-200"}`}>{label}</button>)}
    </div>

    {error ? <div className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-600">{error}</div> : null}
    {loading ? <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-500 shadow-sm">Loading logistics data…</div> : null}

    {!loading && tab === "overview" ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {[["Vehicles", data.kpis?.vehicles, "Fleet master records"], ["Active Vehicles", data.kpis?.activeVehicles, "Available for assignment"], ["Posted Dispatches", data.kpis?.postedDispatches, "Company dispatch posted"], ["Pending Deliveries", data.kpis?.pendingDeliveries, "Secondary orders not delivered"], ["Delivered", data.kpis?.delivered, "Completed customer deliveries"], ["Delivery Users", data.kpis?.deliveryUsers, "Mobile field users"], ["Maintenance Cost", data.kpis?.maintenanceCost, "Vehicle expense"], ["Draft Dispatches", data.kpis?.draftDispatches, "Waiting to post"]].map(([label, value, help]) => <div key={label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{label}</p><p className="mt-3 text-2xl font-black text-slate-950">{label.includes("Cost") ? money(value) : Number(value || 0).toLocaleString()}</p><p className="mt-2 text-sm text-slate-500">{help}</p></div>)}
    </div> : null}

    {!loading && tab === "dispatches" ? <Table title="Company Dispatch Notes" rows={data.primaryDispatches} columns={["Dispatch", "Order", "Distributor", "Status", "Vehicle", "Driver"]} render={(row) => [row.documentNo, row.companySalesOrderId || "-", row.distributorId || "-", statusBadge(row.status), row.vehicleId || "-", row.driverUserId || "-"]} /> : null}
    {!loading && tab === "deliveries" ? <Table title="Customer Deliveries" rows={data.secondaryDeliveries} columns={["Order", "Customer", "Status", "Dispatch", "Financial"]} render={(row) => [row.documentNo, row.customer?.partyName || "-", statusBadge(row.status), row.dispatchStatus || "not_dispatched", row.financialStatus || "not_invoiced"]} /> : null}
    {!loading && tab === "fleet" ? <div className="grid gap-5 xl:grid-cols-2"><Table title="Vehicles" rows={data.vehicles} columns={["Vehicle", "Registration", "Type", "Status"]} render={(row) => [row.nickname || `${row.make || ""} ${row.model || ""}`.trim() || row.vehicleId, row.registrationNo || "-", row.type || "-", row.status || "active"]} /><Table title="Maintenance" rows={data.maintenance} columns={["Date", "Type", "Vendor", "Cost"]} render={(row) => [row.date ? new Date(row.date).toLocaleDateString() : "-", row.maintenanceType || "-", row.vendor || "-", money(row.cost)]} /></div> : null}
    {!loading && tab === "tracking" ? <div className="grid gap-5 xl:grid-cols-2"><Table title="Mobile Field Users" rows={data.deliveryUsers} columns={["User", "Role", "Mobile", "Status"]} render={(row) => [row.fullName || row.username || row.userId, row.role || row.portalType || "-", row.mobileNumber || row.phoneNumber || "-", row.status || "active"]} /><div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h3 className="text-lg font-black text-slate-950">Live Tracking</h3><p className="mt-2 text-sm text-slate-600">Use the existing Live Tracking module for map view, duty sessions, and route playback. Phase 9 connects it with logistics and mobile role operations.</p><a href="/portals/live-tracking" className="mt-4 inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-white">Open Live Tracking</a></div></div> : null}
  </div>;
}

function Table({ title, rows = [], columns = [], render }) {
  return <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 p-4"><h3 className="font-black text-slate-950">{title}</h3><p className="text-xs text-slate-500">{rows.length} records</p></div><div className="overflow-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{columns.map((c) => <th key={c} className="px-4 py-3">{c}</th>)}</tr></thead><tbody>{rows.map((row, idx) => <tr key={row._id || idx} className="border-t border-slate-100">{render(row).map((cell, i) => <td key={i} className="px-4 py-3 align-middle text-slate-700">{cell}</td>)}</tr>)}{!rows.length ? <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-slate-400">No records yet.</td></tr> : null}</tbody></table></div></div>;
}
