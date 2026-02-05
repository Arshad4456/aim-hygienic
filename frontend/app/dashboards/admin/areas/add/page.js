"use client";

import { useEffect, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { apiFetch } from "../../../../lib/api";

export default function AddAreaPage() {
  const [zones, setZones] = useState([]);
  const [zoneId, setZoneId] = useState("");
  const [form, setForm] = useState({
    areaId: "",
    name: "",
    regionId: "",
    regionName: "",
    gpsLatitude: "",
    gpsLongitude: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    async function loadZones() {
      try {
        const data = await apiFetch("/zones");
        setZones(data.zones || []);
      } catch (e) {
        setErr(e.message || "Failed to load zones");
      } finally {
        setLoading(false);
      }
    }
    loadZones();
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
      const zone = zones.find((z) => z._id === zoneId);
      await apiFetch("/areas", {
        method: "POST",
        body: {
          ...form,
          zoneId: zone?.zoneId || "",
          zoneName: zone?.name || "",
          regionId: zone?.regionId || form.regionId,
          regionName: zone?.regionName || form.regionName,
        },
      });
      setOk("✅ Area saved successfully.");
      setForm({ areaId: "", name: "", regionId: "", regionName: "", gpsLatitude: "", gpsLongitude: "" });
    } catch (e2) {
      setErr(e2.message || "Failed to save area");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell title="Add Area" user={null}>
      <div className="rounded-2xl bg-white border shadow-sm p-5">
        <div className="text-xl font-semibold text-zinc-900">Add Area</div>
        <div className="text-sm text-zinc-500 mt-1">Create an area under a zone.</div>

        {err ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div> : null}
        {ok ? <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{ok}</div> : null}

        {loading ? (
          <div className="mt-5 text-sm text-zinc-500">Loading zones...</div>
        ) : (
          <form onSubmit={onSubmit} className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label>Select Zone</Label>
              <select
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                value={zoneId}
                onChange={(e) => setZoneId(e.target.value)}
                required
              >
                <option value="">Choose zone...</option>
                {zones.map((z) => (
                  <option key={z._id} value={z._id}>{z.name}</option>
                ))}
              </select>
            </div>
            <Field label="Area ID" value={form.areaId} onChange={(v) => setField("areaId", v)} required />
            <Field label="Area Name" value={form.name} onChange={(v) => setField("name", v)} required />
            <Field label="Region ID" value={form.regionId} onChange={(v) => setField("regionId", v)} required />
            <Field label="Region Name" value={form.regionName} onChange={(v) => setField("regionName", v)} required />
            <Field label="GPS Latitude" value={form.gpsLatitude} onChange={(v) => setField("gpsLatitude", v)} />
            <Field label="GPS Longitude" value={form.gpsLongitude} onChange={(v) => setField("gpsLongitude", v)} />

            <div className="md:col-span-2 flex items-center gap-3 mt-2">
              <button
                disabled={saving}
                className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Area"}
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
