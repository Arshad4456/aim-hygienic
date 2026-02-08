"use client";

import { useEffect, useState } from "react";
import AdminShell from "../../../components/AdminShell";
import { apiFetch } from "../../../../../lib/api";

export default function AddVehiclePage() {
  const [warehouses, setWarehouses] = useState([]);
  const [regions, setRegions] = useState([]);
  const [zones, setZones] = useState([]);
  const [areas, setAreas] = useState([]);
  const [form, setForm] = useState({
    vehicleId: "",
    name: "",
    type: "",
    plateNumber: "",
    driverId: "",
    driverName: "",
    deliveryCapacity: "",
    attachLevel: "warehouse",
    warehouseId: "",
    regionId: "",
    zoneId: "",
    areaId: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    async function loadLookups() {
      try {
        const [warehouseRes, regionRes, zoneRes, areaRes] = await Promise.all([
          apiFetch("/warehouses"),
          apiFetch("/regions"),
          apiFetch("/zones"),
          apiFetch("/areas"),
        ]);
        setWarehouses(warehouseRes.warehouses || []);
        setRegions(regionRes.regions || []);
        setZones(zoneRes.zones || []);
        setAreas(areaRes.areas || []);
      } catch (e) {
        setErr(e.message || "Failed to load lookups");
      }
    }
    loadLookups();
  }, []);

  function setField(key, value) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setOk("");
    setSaving(true);
    try {
      const warehouse = warehouses.find((w) => w._id === form.warehouseId);
      const region = regions.find((r) => r._id === form.regionId);
      const zone = zones.find((z) => z._id === form.zoneId);
      const area = areas.find((a) => a._id === form.areaId);
      await apiFetch("/vehicles", {
        method: "POST",
        body: {
          ...form,
          warehouseId: warehouse?.warehouseId || "",
          warehouseName: warehouse?.name || "",
          regionId: region?.regionId || "",
          regionName: region?.name || "",
          zoneId: zone?.zoneId || "",
          zoneName: zone?.name || "",
          areaId: area?.areaId || "",
          areaName: area?.name || "",
        },
      });
      setOk("✅ Vehicle saved successfully.");
      setForm({
        vehicleId: "",
        name: "",
        type: "",
        plateNumber: "",
        driverId: "",
        driverName: "",
        deliveryCapacity: "",
        attachLevel: "warehouse",
        warehouseId: "",
        regionId: "",
        zoneId: "",
        areaId: "",
      });
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
          <div className="md:col-span-2">
            <Label>Attach Vehicle To</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {["warehouse", "region", "zone", "area"].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setField("attachLevel", level)}
                  className={`rounded-xl border px-3 py-1.5 text-xs ${form.attachLevel === level ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "hover:bg-zinc-50"}`}
                >
                  {level.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <Field label="Vehicle ID" value={form.vehicleId} onChange={(v) => setField("vehicleId", v)} required />
          <Field label="Vehicle Name" value={form.name} onChange={(v) => setField("name", v)} required />
          <Field label="Vehicle Type" value={form.type} onChange={(v) => setField("type", v)} />
          <Field label="Plate Number" value={form.plateNumber} onChange={(v) => setField("plateNumber", v)} />
          <Field label="Driver ID" value={form.driverId} onChange={(v) => setField("driverId", v)} />
          <Field label="Driver Name" value={form.driverName} onChange={(v) => setField("driverName", v)} />
          <Field label="Delivery Capacity" value={form.deliveryCapacity} onChange={(v) => setField("deliveryCapacity", v)} type="number" />
          <div>
            <Label>Warehouse</Label>
            <select
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              value={form.warehouseId}
              onChange={(e) => setField("warehouseId", e.target.value)}
              required
            >
              <option value="">Choose warehouse...</option>
              {warehouses.map((w) => (
                <option key={w._id} value={w._id}>{w.name}</option>
              ))}
            </select>
          </div>
          {["region", "zone", "area"].includes(form.attachLevel) ? (
            <div>
              <Label>Region</Label>
              <select
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                value={form.regionId}
                onChange={(e) => setField("regionId", e.target.value)}
                required
              >
                <option value="">Choose region...</option>
                {regions.map((r) => (
                  <option key={r._id} value={r._id}>{r.name}</option>
                ))}
              </select>
            </div>
          ) : null}
          {["zone", "area"].includes(form.attachLevel) ? (
            <div>
              <Label>Zone</Label>
              <select
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                value={form.zoneId}
                onChange={(e) => setField("zoneId", e.target.value)}
                required
              >
                <option value="">Choose zone...</option>
                {zones.map((z) => (
                  <option key={z._id} value={z._id}>{z.name}</option>
                ))}
              </select>
            </div>
          ) : null}
          {form.attachLevel === "area" ? (
            <div>
              <Label>Area</Label>
              <select
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                value={form.areaId}
                onChange={(e) => setField("areaId", e.target.value)}
                required
              >
                <option value="">Choose area...</option>
                {areas.map((a) => (
                  <option key={a._id} value={a._id}>{a.name}</option>
                ))}
              </select>
            </div>
          ) : null}

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
