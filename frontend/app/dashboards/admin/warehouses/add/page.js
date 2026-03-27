"use client";

import { useState } from "react";
import AdminShell from "../../components/AdminShell";
import { apiFetch } from "../../../../lib/api";
import useCompanyScope from "../../components/useCompanyScope";

export default function AddWarehousePage() {
  const { companies, companyDocId, setCompanyDocId, selectedCompany, canSelectCompany } = useCompanyScope();
  const [form, setForm] = useState({
    warehouseId: "",
    name: "",
    mobileNumber: "",
    phoneNumber: "",
    capacity: "",
    status: "active",
    address: "",
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
      if (!selectedCompany?.companyId) throw new Error("Please select company");
      await apiFetch("/warehouses", {
        method: "POST",
        body: {
          ...form,
          companyId: selectedCompany?.companyId || "",
          companyName: selectedCompany?.name || "",
        },
      });
      setOk("✅ Warehouse saved successfully.");
      setForm({ warehouseId: "", name: "", mobileNumber: "", phoneNumber: "", capacity: "", status: "active", address: "" });
    } catch (e2) {
      setErr(e2.message || "Failed to save warehouse");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell title="Add Warehouse" user={null}>
      <div className="rounded-2xl bg-white border shadow-sm p-5">
        <div className="text-xl font-semibold text-zinc-900">Add Warehouse</div>
        <div className="text-sm text-zinc-500 mt-1">Current setup supports one warehouse for all regions.</div>

        {err ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div> : null}
        {ok ? <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{ok}</div> : null}

        <form onSubmit={onSubmit} className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label>Select Company</Label>
            <select className="mt-1 w-full rounded-xl border px-3 py-2 text-sm disabled:bg-zinc-100 disabled:text-zinc-600" value={companyDocId} onChange={(e) => setCompanyDocId(e.target.value)} disabled={!canSelectCompany}>
              <option value="">{canSelectCompany ? "Choose company..." : "Company selected by role"}</option>
              {companies.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
          <Field label="Warehouse ID" value={form.warehouseId} onChange={(v) => setField("warehouseId", v)} required />
          <Field label="Warehouse Name" value={form.name} onChange={(v) => setField("name", v)} required />
          <Field label="Mobile Number" value={form.mobileNumber} onChange={(v) => setField("mobileNumber", v)} required />
          <Field label="Phone Number" value={form.phoneNumber} onChange={(v) => setField("phoneNumber", v)} required />
          <Field label="Capacity" value={form.capacity} onChange={(v) => setField("capacity", v)} type="number" required />
          <div>
            <Label>Status</Label>
            <select className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" value={form.status} onChange={(e) => setField("status", e.target.value)}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <Label>Address</Label>
            <textarea className="mt-1 w-full rounded-xl border px-3 py-2" rows={3} value={form.address} onChange={(e) => setField("address", e.target.value)} required />
          </div>
          <div className="md:col-span-2">
            <button disabled={saving} className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-60">
              {saving ? "Saving..." : "Save Warehouse"}
            </button>
          </div>
        </form>
      </div>
    </AdminShell>
  );
}

function Label({ children }) { return <div className="text-sm font-medium text-zinc-800">{children}</div>; }
function Field({ label, value, onChange, type = "text", required = false }) {
  return <div><Label>{label}</Label><input type={type} required={required} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2" /></div>;
}
