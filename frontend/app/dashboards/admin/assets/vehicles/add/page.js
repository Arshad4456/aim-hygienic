"use client";

import { useState } from "react";
import AdminShell from "../../../components/AdminShell";
import { apiFetch } from "../../../../../lib/api";

export default function AddVehiclePage() {
  const [form, setForm] = useState({
    vehicleId: "",
    name: "",
    type: "",
    plateNumber: "",
    driverId: "",
    driverName: "",
    deliveryCapacity: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  function setField(key, value) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setOk("");
    setSaving(true);
    try {
      await apiFetch("/vehicles", { method: "POST", body: form });
      setOk("✅ Vehicle saved successfully.");
      setForm({ vehicleId: "", name: "", type: "", plateNumber: "", driverId: "", driverName: "", deliveryCapacity: "" });
    } catch (e2) {
      setErr(e2.message || "Failed to save vehicle");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell title="Add Vehicle" user={null}>
      <div className="rounded-2xl bg-white border shadow-sm p-5">
        <div className="text-xl font-semibold text-zinc-900">Add Vehicle</div>
        <div className="text-sm text-zinc-500 mt-1">Register a vehicle asset.</div>

        {err ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div> : null}
        {ok ? <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{ok}</div> : null}

        <form onSubmit={onSubmit} className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Vehicle ID" value={form.vehicleId} onChange={(v) => setField("vehicleId", v)} required />
          <Field label="Vehicle Name" value={form.name} onChange={(v) => setField("name", v)} required />
          <Field label="Vehicle Type" value={form.type} onChange={(v) => setField("type", v)} />
          <Field label="Plate Number" value={form.plateNumber} onChange={(v) => setField("plateNumber", v)} />
          <Field label="Driver ID" value={form.driverId} onChange={(v) => setField("driverId", v)} />
          <Field label="Driver Name" value={form.driverName} onChange={(v) => setField("driverName", v)} />
          <Field label="Delivery Capacity" value={form.deliveryCapacity} onChange={(v) => setField("deliveryCapacity", v)} type="number" />

          <div className="md:col-span-2 flex items-center gap-3 mt-2">
            <button
              disabled={saving}
              className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Vehicle"}
            </button>
          </div>
        </form>
      </div>
    </AdminShell>
  );
}

function Label({ children }) {
  return <div className="text-sm font-medium text-zinc-800">{children}</div>;
}

function Field({ label, value, onChange, type = "text", required = false }) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200"
      />
    </div>
  );
}