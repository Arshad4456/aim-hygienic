"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { apiFetch } from "../../../../lib/api";
import { ToastStack, useToastStack } from "../components/ToastStick";

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

export default function FuelManagementPage() {
  const [vehicles, setVehicles] = useState([]);
  const [trips, setTrips] = useState([]);
  const [refuels, setRefuels] = useState([]);
  const [savingTrip, setSavingTrip] = useState(false);
  const [savingRefuel, setSavingRefuel] = useState(false);
  const { toasts, addToast, closeToast } = useToastStack();

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

      <div className="rounded-2xl border bg-white p-4 mt-3 overflow-auto">
        <div className="font-semibold mb-2">Trip Ledger</div>
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
            {trips.map((t) => {
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

      <div className="rounded-2xl border bg-white p-4 mt-3 overflow-auto">
        <div className="font-semibold mb-2">Refuel Ledger</div>
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
            {refuels.map((r) => {
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