"use client";

import { useEffect, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { apiFetch } from "../../../../lib/api";

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

export default function FuelManagementPage() {
  const [vehicles, setVehicles] = useState([]);
  const [trips, setTrips] = useState([]);
  const [error, setError] = useState("");
  const [savingTrip, setSavingTrip] = useState(false);
  const [savingRefuel, setSavingRefuel] = useState(false);

  const [form, setForm] = useState({ vehicleId: "", tripType: "company", tripDate: "", fromPlace: "", toPlace: "", startOdometer: "", endOdometer: "", liters: "" });
  const [startFile, setStartFile] = useState(null);
  const [endFile, setEndFile] = useState(null);

  const [refuel, setRefuel] = useState({ vehicleId: "", date: "", liters: "", cost: "", vendor: "" });
  const [receipt, setReceipt] = useState(null);

  const load = async () => {
    const [v, t] = await Promise.all([apiFetch("/vehicles"), apiFetch("/vehicle-management/trips")]);
    setVehicles(v.vehicles || []);
    setTrips(t.trips || []);
  };

  useEffect(() => {
    load().catch(() => setError("Failed to load fuel management data"));
  }, []);

  async function saveTrip() {
    setError("");
    setSavingTrip(true);
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
    } catch (e) {
      setError(e.message || "Failed to save trip");
    } finally {
      setSavingTrip(false);
    }
  }

  async function saveRefuel() {
    setError("");
    setSavingRefuel(true);
    try {
      if (!refuel.vehicleId || !refuel.date || !refuel.liters) throw new Error("Please fill required refuel fields");
      if (!receipt) throw new Error("Fuel receipt image is required");

      const refuelId = crypto.randomUUID();
      const receiptUrl = await uploadProof(receipt, { vehicleId: refuel.vehicleId, entity: "fuel", recordId: refuelId, slot: "receipt", date: refuel.date });

      await apiFetch("/vehicle-management/refuels", {
        method: "POST",
        body: { ...refuel, liters: Number(refuel.liters || 0), cost: Number(refuel.cost || 0), receiptUrl },
      });

      setRefuel({ vehicleId: "", date: "", liters: "", cost: "", vendor: "" });
      setReceipt(null);
    } catch (e) {
      setError(e.message || "Failed to save refuel");
    } finally {
      setSavingRefuel(false);
    }
  }

  return (
    <AdminShell title="Fuel Management" user={null}>
      {error ? <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-2 mb-3 text-sm">{error}</div> : null}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <TripForm
          vehicles={vehicles}
          form={form}
          setForm={setForm}
          setStartFile={setStartFile}
          setEndFile={setEndFile}
          onSubmit={saveTrip}
          saving={savingTrip}
        />
        <RefuelForm vehicles={vehicles} form={refuel} setForm={setRefuel} setReceipt={setReceipt} onSubmit={saveRefuel} saving={savingRefuel} />
      </div>

      <div className="rounded-2xl border bg-white p-4 mt-3">
        <div className="font-semibold mb-2">Recent Trips</div>
        {trips.map((t) => (
          <div key={t._id} className="text-sm border-t py-1">
            {new Date(t.tripDate).toLocaleDateString()} · {t.tripType} · {t.distance} KM · {t.fromPlace} → {t.toPlace}
          </div>
        ))}
      </div>
    </AdminShell>
  );
}

function TripForm({ vehicles, form, setForm, setStartFile, setEndFile, onSubmit, saving }) {
  const set = (k, v) => setForm((x) => ({ ...x, [k]: v }));
  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="font-semibold mb-2">Trip Entry</div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <select value={form.vehicleId} onChange={(e) => set("vehicleId", e.target.value)} className="border rounded-xl px-2 py-2"><option value="">Vehicle</option>{vehicles.map((v) => <option key={v._id} value={v._id}>{v.registrationNo}</option>)}</select>
        <input type="date" value={form.tripDate} onChange={(e) => set("tripDate", e.target.value)} className="border rounded-xl px-2 py-2" />
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
        <select value={form.vehicleId} onChange={(e) => set("vehicleId", e.target.value)} className="border rounded-xl px-2 py-2"><option value="">Vehicle</option>{vehicles.map((v) => <option key={v._id} value={v._id}>{v.registrationNo}</option>)}</select>
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
