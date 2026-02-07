"use client";

import { useEffect, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { apiFetch } from "../../../../lib/api";

export default function AddZonePage() {
  const [warehouses, setWarehouses] = useState([]);
  const [warehouseId, setWarehouseId] = useState("");
  const [regions, setRegions] = useState([]);
  const [regionId, setRegionId] = useState("");
  const [form, setForm] = useState({
    zoneId: "",
    name: "",
    gpsLatitude: "",
    gpsLongitude: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    async function loadLookups() {
      try {
        const [warehouseData, regionData] = await Promise.all([
          apiFetch("/warehouses"),
          apiFetch("/regions"),
        ]);
        setWarehouses(warehouseData.warehouses || []);
        setRegions(regionData.regions || []);
      } catch (e) {
        setErr(e.message || "Failed to load regions");
      } finally {
        setLoading(false);
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
      const warehouse = warehouses.find((w) => w._id === warehouseId);
      const region = regions.find((r) => r._id === regionId);
      await apiFetch("/zones", {
        method: "POST",
        body: {
          ...form,
          warehouseId: warehouse?.warehouseId || "",
          warehouseName: warehouse?.name || "",
          regionId: region?.regionId || "",
          regionName: region?.name || "",
        },
      });
      setOk("✅ Zone saved successfully.");
      setForm({ zoneId: "", name: "", gpsLatitude: "", gpsLongitude: "" });
      setWarehouseId("");
      setRegionId("");
    } catch (e2) {
      setErr(e2.message || "Failed to save zone");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell title="Add Zone" user={null}>
      <div className="rounded-2xl bg-white border shadow-sm p-5">
        <div className="text-xl font-semibold text-zinc-900">Add Zone</div>
        <div className="text-sm text-zinc-500 mt-1">Create a zone under a region.</div>

        {err ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div> : null}
        {ok ? <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{ok}</div> : null}

        {loading ? (
          <div className="mt-5 text-sm text-zinc-500">Loading regions...</div>
        ) : (
          <form onSubmit={onSubmit} className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label>Select Warehouse</Label>
              <select
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                required
              >
                <option value="">Choose warehouse...</option>
                {warehouses.map((w) => (
                  <option key={w._id} value={w._id}>{w.name}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <Label>Select Region</Label>
              <select
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                value={regionId}
                onChange={(e) => setRegionId(e.target.value)}
                required
              >
                <option value="">Choose region...</option>
                {regions.map((r) => (
                  <option key={r._id} value={r._id}>{r.name}</option>
                ))}
              </select>
            </div>
            <Field label="Zone ID" value={form.zoneId} onChange={(v) => setField("zoneId", v)} required />
            <Field label="Zone Name" value={form.name} onChange={(v) => setField("name", v)} required />
            <Field label="GPS Latitude" value={form.gpsLatitude} onChange={(v) => setField("gpsLatitude", v)} />
            <Field label="GPS Longitude" value={form.gpsLongitude} onChange={(v) => setField("gpsLongitude", v)} />

            <div className="md:col-span-2 flex items-center gap-3 mt-2">
              <button
                disabled={saving}
                className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Zone"}
              </button>
            </div>
          </form>
        )}
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