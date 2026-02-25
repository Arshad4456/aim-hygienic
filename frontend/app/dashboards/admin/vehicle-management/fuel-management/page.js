"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { apiFetch } from "../../../../lib/api";
import { ToastStack, useToastStack } from "../components/ToastStick";

const PAGE_SIZE = 20;

async function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read selected file"));
    reader.readAsDataURL(file);
  });
}

async function uploadProof(file, payload) {
  if (!file) throw new Error("Proof image is required");
  const fileBase64 = await fileToDataUrl(file);
  const result = await apiFetch("/uploads/vehicle-proof", {
    method: "POST",
    body: { ...payload, contentType: file.type || "image/jpeg", fileBase64 },
  });
  return result.publicUrl;
}

function vehicleLabel(vehicle) {
  return `${vehicle.registrationNo || "No-Reg"} · ${vehicle.make || ""} ${vehicle.model || ""}${vehicle.assignedUserName ? ` · ${vehicle.assignedUserName}` : ""}`.trim();
}

function renderProof(url, label) {
  if (!url) return <span className="text-zinc-400">-</span>;
  return (
    <a href={url} target="_blank" rel="noreferrer" className="inline-flex flex-col gap-1 text-emerald-700 hover:underline">
      <img src={url} alt={label} className="h-12 w-16 object-cover rounded border" />
      <span className="text-xs">View</span>
    </a>
  );
}

function paginate(rows, page) {
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  return { totalPages, page: safePage, rows: rows.slice(start, start + PAGE_SIZE) };
}

export default function FuelManagementPage() {
  const [vehicles, setVehicles] = useState([]);
  const [trips, setTrips] = useState([]);
  const [refuels, setRefuels] = useState([]);
  const [savingTrip, setSavingTrip] = useState(false);
  const [savingRefuel, setSavingRefuel] = useState(false);
  const { toasts, addToast, closeToast } = useToastStack();

  const [tripPage, setTripPage] = useState(1);
  const [refuelPage, setRefuelPage] = useState(1);

  const [tripFilters, setTripFilters] = useState({ search: "", vehicleId: "", tripType: "", from: "", to: "" });
  const [refuelFilters, setRefuelFilters] = useState({ search: "", vehicleId: "", from: "", to: "" });

  const [form, setForm] = useState({ vehicleId: "", tripType: "company", tripDate: "", fromPlace: "", toPlace: "", startOdometer: "", endOdometer: "", liters: "" });
  const [startFile, setStartFile] = useState(null);
  const [endFile, setEndFile] = useState(null);

  const [refuel, setRefuel] = useState({ vehicleId: "", date: "", liters: "", cost: "", vendor: "" });
  const [receipt, setReceipt] = useState(null);

  const vehiclesMap = useMemo(() => {
    const map = new Map();
    vehicles.forEach((v) => map.set(v._id, v));
    return map;
  }, [vehicles]);

  const load = async () => {
    const [v, t, r] = await Promise.all([
      apiFetch("/vehicles"),
      apiFetch("/vehicle-management/trips"),
      apiFetch("/vehicle-management/refuels"),
    ]);
    setVehicles(v.vehicles || []);
    setTrips(t.trips || []);
    setRefuels(r.refuels || []);
  };

  useEffect(() => {
    load().catch((e) => addToast(e.message || "Failed to load fuel management data", "error"));
  }, []);

  const filteredTrips = useMemo(() => {
    return trips.filter((t) => {
      const v = vehiclesMap.get(t.vehicleId) || {};
      const text = `${vehicleLabel(v)} ${t.fromPlace || ""} ${t.toPlace || ""}`.toLowerCase();
      const q = tripFilters.search.trim().toLowerCase();
      if (q && !text.includes(q)) return false;
      if (tripFilters.vehicleId && String(t.vehicleId) !== String(tripFilters.vehicleId)) return false;
      if (tripFilters.tripType && String(t.tripType) !== String(tripFilters.tripType)) return false;
      if (tripFilters.from && String(t.tripDate || "").slice(0, 10) < tripFilters.from) return false;
      if (tripFilters.to && String(t.tripDate || "").slice(0, 10) > tripFilters.to) return false;
      return true;
    });
  }, [trips, tripFilters, vehiclesMap]);

  const filteredRefuels = useMemo(() => {
    return refuels.filter((r) => {
      const v = vehiclesMap.get(r.vehicleId) || {};
      const text = `${vehicleLabel(v)} ${r.vendor || ""}`.toLowerCase();
      const q = refuelFilters.search.trim().toLowerCase();
      if (q && !text.includes(q)) return false;
      if (refuelFilters.vehicleId && String(r.vehicleId) !== String(refuelFilters.vehicleId)) return false;
      if (refuelFilters.from && String(r.date || "").slice(0, 10) < refuelFilters.from) return false;
      if (refuelFilters.to && String(r.date || "").slice(0, 10) > refuelFilters.to) return false;
      return true;
    });
  }, [refuels, refuelFilters, vehiclesMap]);

  useEffect(() => setTripPage(1), [tripFilters, trips.length]);
  useEffect(() => setRefuelPage(1), [refuelFilters, refuels.length]);

  const tripPageData = paginate(filteredTrips, tripPage);
  const refuelPageData = paginate(filteredRefuels, refuelPage);

  async function saveTrip() {
    setSavingTrip(true);
    const pending = addToast("Promise is pending", "pending", true);
    try {
      if (!form.vehicleId || !form.tripDate || !form.fromPlace || !form.toPlace) throw new Error("Please fill required trip fields");
      if (!startFile || !endFile) throw new Error("Start and End meter photos are required");

      const tripId = crypto.randomUUID();
      const startMeterUrl = await uploadProof(startFile, { vehicleId: form.vehicleId, entity: "fuel", recordId: tripId, slot: "start", date: form.tripDate });
      const endMeterUrl = await uploadProof(endFile, { vehicleId: form.vehicleId, entity: "fuel", recordId: tripId, slot: "end", date: form.tripDate });

      await apiFetch("/vehicle-management/trips", {
        method: "POST",
        body: { ...form, liters: Number(form.liters || 0), startMeterUrl, endMeterUrl },
      });

      await load();
      setForm({ vehicleId: "", tripType: "company", tripDate: "", fromPlace: "", toPlace: "", startOdometer: "", endOdometer: "", liters: "" });
      setStartFile(null);
      setEndFile(null);
      closeToast(pending);
      addToast("Trip saved successfully", "success");
    } catch (e) {
      closeToast(pending);
      addToast(e.message || "Failed to save trip", "error");
    } finally {
      setSavingTrip(false);
    }
  }

  async function saveRefuel() {
    setSavingRefuel(true);
    const pending = addToast("Promise is pending", "pending", true);
    try {
      if (!refuel.vehicleId || !refuel.date || !refuel.liters) throw new Error("Please fill required refuel fields");
      if (!receipt) throw new Error("Fuel receipt image is required");

      const refuelId = crypto.randomUUID();
      const receiptUrl = await uploadProof(receipt, { vehicleId: refuel.vehicleId, entity: "fuel", recordId: refuelId, slot: "receipt", date: refuel.date });

      await apiFetch("/vehicle-management/refuels", {
        method: "POST",
        body: { ...refuel, liters: Number(refuel.liters || 0), cost: Number(refuel.cost || 0), receiptUrl },
      });

      await load();
      setRefuel({ vehicleId: "", date: "", liters: "", cost: "", vendor: "" });
      setReceipt(null);
      closeToast(pending);
      addToast("Refuel saved successfully", "success");
    } catch (e) {
      closeToast(pending);
      addToast(e.message || "Failed to save refuel", "error");
    } finally {
      setSavingRefuel(false);
    }
  }

  return (
    <AdminShell title="Fuel Management" user={null}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <TripForm
          vehicles={vehicles}
          form={form}
          setForm={setForm}
          setStartFile={(f) => {
            setStartFile(f);
            if (f) addToast("Start meter photo selected", "info");
          }}
          setEndFile={(f) => {
            setEndFile(f);
            if (f) addToast("End meter photo selected", "info");
          }}
          onSubmit={saveTrip}
          saving={savingTrip}
        />
        <RefuelForm
          vehicles={vehicles}
          form={refuel}
          setForm={setRefuel}
          setReceipt={(f) => {
            setReceipt(f);
            if (f) addToast("Fuel receipt selected", "info");
          }}
          onSubmit={saveRefuel}
          saving={savingRefuel}
        />
      </div>

      <LedgerFilters
        title="Trip Ledger"
        total={filteredTrips.length}
        page={tripPageData.page}
        totalPages={tripPageData.totalPages}
        onFirst={() => setTripPage(1)}
        onPrev={() => setTripPage((p) => Math.max(1, p - 1))}
        onNext={() => setTripPage((p) => Math.min(tripPageData.totalPages, p + 1))}
        onEnd={() => setTripPage(tripPageData.totalPages)}
      >
        <input value={tripFilters.search} onChange={(e) => setTripFilters((s) => ({ ...s, search: e.target.value }))} placeholder="Search route / vehicle" className="border rounded-lg px-2 py-1.5 text-sm" />
        <select value={tripFilters.vehicleId} onChange={(e) => setTripFilters((s) => ({ ...s, vehicleId: e.target.value }))} className="border rounded-lg px-2 py-1.5 text-sm">
          <option value="">All vehicles</option>
          {vehicles.map((v) => <option key={v._id} value={v._id}>{vehicleLabel(v)}</option>)}
        </select>
        <select value={tripFilters.tripType} onChange={(e) => setTripFilters((s) => ({ ...s, tripType: e.target.value }))} className="border rounded-lg px-2 py-1.5 text-sm">
          <option value="">All trip types</option>
          <option value="company">Company Work</option>
          <option value="personal">Personal Use</option>
        </select>
        <input type="date" value={tripFilters.from} onChange={(e) => setTripFilters((s) => ({ ...s, from: e.target.value }))} className="border rounded-lg px-2 py-1.5 text-sm" />
        <input type="date" value={tripFilters.to} onChange={(e) => setTripFilters((s) => ({ ...s, to: e.target.value }))} className="border rounded-lg px-2 py-1.5 text-sm" />
      </LedgerFilters>

      <div className="rounded-2xl border bg-white p-4 mt-3 overflow-auto">
        <table className="min-w-[1200px] w-full text-sm">
          <thead>
            <tr className="text-left bg-zinc-50">
              <th className="px-2 py-2 border">Date</th>
              <th className="px-2 py-2 border">Vehicle / User</th>
              <th className="px-2 py-2 border">Trip Type</th>
              <th className="px-2 py-2 border">Route</th>
              <th className="px-2 py-2 border">Odometer</th>
              <th className="px-2 py-2 border">Distance</th>
              <th className="px-2 py-2 border">Liters</th>
              <th className="px-2 py-2 border">Start Proof</th>
              <th className="px-2 py-2 border">End Proof</th>
              <th className="px-2 py-2 border">Receipt</th>
            </tr>
          </thead>
          <tbody>
            {tripPageData.rows.map((t) => {
              const v = vehiclesMap.get(t.vehicleId) || {};
              return (
                <tr key={t._id} className="align-top">
                  <td className="px-2 py-2 border">{new Date(t.tripDate).toLocaleDateString()}</td>
                  <td className="px-2 py-2 border">{vehicleLabel(v)}</td>
                  <td className="px-2 py-2 border">{t.tripType}</td>
                  <td className="px-2 py-2 border">{t.fromPlace} → {t.toPlace}</td>
                  <td className="px-2 py-2 border">{t.startOdometer} / {t.endOdometer}</td>
                  <td className="px-2 py-2 border">{t.distance}</td>
                  <td className="px-2 py-2 border">{t.liters || 0}</td>
                  <td className="px-2 py-2 border">{renderProof(t.startMeterUrl, "start meter")}</td>
                  <td className="px-2 py-2 border">{renderProof(t.endMeterUrl, "end meter")}</td>
                  <td className="px-2 py-2 border">{renderProof(t.fuelReceiptUrl, "fuel receipt")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <LedgerFilters
        title="Refuel Ledger"
        total={filteredRefuels.length}
        page={refuelPageData.page}
        totalPages={refuelPageData.totalPages}
        onFirst={() => setRefuelPage(1)}
        onPrev={() => setRefuelPage((p) => Math.max(1, p - 1))}
        onNext={() => setRefuelPage((p) => Math.min(refuelPageData.totalPages, p + 1))}
        onEnd={() => setRefuelPage(refuelPageData.totalPages)}
      >
        <input value={refuelFilters.search} onChange={(e) => setRefuelFilters((s) => ({ ...s, search: e.target.value }))} placeholder="Search vehicle / vendor" className="border rounded-lg px-2 py-1.5 text-sm" />
        <select value={refuelFilters.vehicleId} onChange={(e) => setRefuelFilters((s) => ({ ...s, vehicleId: e.target.value }))} className="border rounded-lg px-2 py-1.5 text-sm">
          <option value="">All vehicles</option>
          {vehicles.map((v) => <option key={v._id} value={v._id}>{vehicleLabel(v)}</option>)}
        </select>
        <input type="date" value={refuelFilters.from} onChange={(e) => setRefuelFilters((s) => ({ ...s, from: e.target.value }))} className="border rounded-lg px-2 py-1.5 text-sm" />
        <input type="date" value={refuelFilters.to} onChange={(e) => setRefuelFilters((s) => ({ ...s, to: e.target.value }))} className="border rounded-lg px-2 py-1.5 text-sm" />
      </LedgerFilters>

      <div className="rounded-2xl border bg-white p-4 mt-3 overflow-auto">
        <table className="min-w-[900px] w-full text-sm">
          <thead>
            <tr className="text-left bg-zinc-50">
              <th className="px-2 py-2 border">Date</th>
              <th className="px-2 py-2 border">Vehicle / User</th>
              <th className="px-2 py-2 border">Odometer</th>
              <th className="px-2 py-2 border">Liters</th>
              <th className="px-2 py-2 border">Cost</th>
              <th className="px-2 py-2 border">Vendor</th>
              <th className="px-2 py-2 border">Receipt Proof</th>
            </tr>
          </thead>
          <tbody>
            {refuelPageData.rows.map((r) => {
              const v = vehiclesMap.get(r.vehicleId) || {};
              return (
                <tr key={r._id} className="align-top">
                  <td className="px-2 py-2 border">{new Date(r.date).toLocaleDateString()}</td>
                  <td className="px-2 py-2 border">{vehicleLabel(v)}</td>
                  <td className="px-2 py-2 border">{r.odometer || "-"}</td>
                  <td className="px-2 py-2 border">{r.liters}</td>
                  <td className="px-2 py-2 border">{r.cost || 0}</td>
                  <td className="px-2 py-2 border">{r.vendor || "-"}</td>
                  <td className="px-2 py-2 border">{renderProof(r.receiptUrl, "refuel receipt")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ToastStack items={toasts} onClose={closeToast} />
    </AdminShell>
  );
}

function TripForm({ vehicles, form, setForm, setStartFile, setEndFile, onSubmit, saving }) {
  const set = (k, v) => setForm((x) => ({ ...x, [k]: v }));
  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="font-semibold mb-2">Trip Entry</div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <select value={form.vehicleId} onChange={(e) => set("vehicleId", e.target.value)} className="border rounded-xl px-2 py-2">
          <option value="">Vehicle</option>
          {vehicles.map((v) => <option key={v._id} value={v._id}>{vehicleLabel(v)}</option>)}
        </select>
        <input type="date" value={form.tripDate} onChange={(e) => set("tripDate", e.target.value)} className="border rounded-xl px-2 py-2" />
        <select value={form.tripType} onChange={(e) => set("tripType", e.target.value)} className="border rounded-xl px-2 py-2">
          <option value="company">Company Work</option>
          <option value="personal">Personal Use</option>
        </select>
        <input placeholder="From" value={form.fromPlace} onChange={(e) => set("fromPlace", e.target.value)} className="border rounded-xl px-2 py-2" />
        <input placeholder="To" value={form.toPlace} onChange={(e) => set("toPlace", e.target.value)} className="border rounded-xl px-2 py-2" />
        <input placeholder="Start Odometer" type="number" value={form.startOdometer} onChange={(e) => set("startOdometer", e.target.value)} className="border rounded-xl px-2 py-2" />
        <input placeholder="End Odometer" type="number" value={form.endOdometer} onChange={(e) => set("endOdometer", e.target.value)} className="border rounded-xl px-2 py-2" />
        <input type="file" accept="image/*" onChange={(e) => setStartFile(e.target.files?.[0] || null)} />
        <input type="file" accept="image/*" onChange={(e) => setEndFile(e.target.files?.[0] || null)} />
        <button type="button" onClick={onSubmit} disabled={saving} className="col-span-2 bg-emerald-600 text-white rounded-xl px-3 py-2 disabled:opacity-70">{saving ? "Saving..." : "Save Trip"}</button>
      </div>
    </div>
  );
}

function RefuelForm({ vehicles, form, setForm, setReceipt, onSubmit, saving }) {
  const set = (k, v) => setForm((x) => ({ ...x, [k]: v }));
  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="font-semibold mb-2">Refuel Entry</div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <select value={form.vehicleId} onChange={(e) => set("vehicleId", e.target.value)} className="border rounded-xl px-2 py-2">
          <option value="">Vehicle</option>
          {vehicles.map((v) => <option key={v._id} value={v._id}>{vehicleLabel(v)}</option>)}
        </select>
        <input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} className="border rounded-xl px-2 py-2" />
        <input placeholder="Liters" type="number" value={form.liters} onChange={(e) => set("liters", e.target.value)} className="border rounded-xl px-2 py-2" />
        <input placeholder="Cost" type="number" value={form.cost} onChange={(e) => set("cost", e.target.value)} className="border rounded-xl px-2 py-2" />
        <input placeholder="Vendor" value={form.vendor} onChange={(e) => set("vendor", e.target.value)} className="border rounded-xl px-2 py-2" />
        <input type="file" accept="image/*" onChange={(e) => setReceipt(e.target.files?.[0] || null)} />
        <button type="button" onClick={onSubmit} disabled={saving} className="col-span-2 bg-emerald-600 text-white rounded-xl px-3 py-2 disabled:opacity-70">{saving ? "Saving..." : "Save Refuel"}</button>
      </div>
    </div>
  );
}

function LedgerFilters({ title, children, total, page, totalPages, onFirst, onPrev, onNext, onEnd }) {
  return (
    <div className="rounded-2xl border bg-white p-4 mt-3">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="font-semibold">{title}</div>
        <div className="text-xs text-zinc-500">{total} entries · Page {page} of {totalPages}</div>
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
      <div className="flex flex-wrap items-center gap-2 mt-3">
        <button type="button" onClick={onFirst} disabled={page <= 1} className="rounded border px-2 py-1 text-xs disabled:opacity-50">Start</button>
        <button type="button" onClick={onPrev} disabled={page <= 1} className="rounded border px-2 py-1 text-xs disabled:opacity-50">Previous</button>
        <button type="button" onClick={onNext} disabled={page >= totalPages} className="rounded border px-2 py-1 text-xs disabled:opacity-50">Next</button>
        <button type="button" onClick={onEnd} disabled={page >= totalPages} className="rounded border px-2 py-1 text-xs disabled:opacity-50">End</button>
      </div>
    </div>
  );
}