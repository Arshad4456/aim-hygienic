"use client";

import { useState } from "react";
import AdminShell from "../../components/AdminShell";

export default function AddAreaPage() {
  const [form, setForm] = useState({
    areaId: "",
    name: "",
    regionId: "",
    regionName: "",
    zoneId: "",
    zoneName: "",
    latitude: "",
    longitude: "",
  });
  const [ok, setOk] = useState("");

  function setField(key, value) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  function onSubmit(e) {
    e.preventDefault();
    setOk("✅ Area saved (demo only).");
  }

  return (
    <AdminShell title="Add Area" user={null}>
      <div className="rounded-2xl bg-white border shadow-sm p-5">
        <div className="text-xl font-semibold text-zinc-900">Add Area</div>
        <div className="text-sm text-zinc-500 mt-1">Create an area under a zone.</div>

        {ok ? <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{ok}</div> : null}

        <form onSubmit={onSubmit} className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Area ID" value={form.areaId} onChange={(v) => setField("areaId", v)} required />
          <Field label="Area Name" value={form.name} onChange={(v) => setField("name", v)} required />
          <Field label="Region ID" value={form.regionId} onChange={(v) => setField("regionId", v)} required />
          <Field label="Region Name" value={form.regionName} onChange={(v) => setField("regionName", v)} required />
          <Field label="Zone ID" value={form.zoneId} onChange={(v) => setField("zoneId", v)} required />
          <Field label="Zone Name" value={form.zoneName} onChange={(v) => setField("zoneName", v)} required />
          <Field label="GPS Latitude" value={form.latitude} onChange={(v) => setField("latitude", v)} />
          <Field label="GPS Longitude" value={form.longitude} onChange={(v) => setField("longitude", v)} />

          <div className="md:col-span-2 flex items-center gap-3 mt-2">
            <button className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700">
              Save Area
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
