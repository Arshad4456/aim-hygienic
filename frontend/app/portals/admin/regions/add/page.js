"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { apiFetch } from "../../../../lib/api";
import useCompanyScope from "../../components/useCompanyScope";

export default function AddRegionPage() {
  const { companies, companyDocId, setCompanyDocId, selectedCompany, canSelectCompany } = useCompanyScope();
  const [warehouses, setWarehouses] = useState([]);
  const [form, setForm] = useState({ regionId: "", name: "", warehouseDocId: "", status: "active" });
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    apiFetch("/warehouses").then((d) => setWarehouses(d.warehouses || [])).catch((e) => setErr(e.message));
  }, []);

  const filteredWarehouses = useMemo(
    () => warehouses.filter((w) => !selectedCompany?.companyId || String(w.companyId || "") === String(selectedCompany.companyId || "")),
    [warehouses, selectedCompany],
  );

  function setField(k, v) { setForm((s) => ({ ...s, [k]: v })); }

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setOk("");
    try {
      if (!selectedCompany?.companyId) throw new Error("Please select company");
      const w = filteredWarehouses.find((x) => x._id === form.warehouseDocId);
      await apiFetch("/regions", {
        method: "POST",
        body: {
          regionId: form.regionId,
          name: form.name,
          warehouseId: w?.warehouseId || "",
          warehouseName: w?.name || "",
          companyId: selectedCompany.companyId,
          companyName: selectedCompany.name,
          status: form.status,
        },
      });
      setOk("✅ Region saved successfully.");
      setForm({ regionId: "", name: "", warehouseDocId: "", status: "active" });
    } catch (e2) {
      setErr(e2.message || "Failed to save region");
    }
  }

  return (
    <AdminShell title="Add Region" user={null}>
      <div className="rounded-2xl bg-white border shadow-sm p-5">
        <div className="text-xl font-semibold">Add Region</div>
        <div className="text-sm text-zinc-500 mt-1">Each region connects to the selected warehouse.</div>
        {err ? <div className="mt-3 text-sm text-red-600">{err}</div> : null}
        {ok ? <div className="mt-3 text-sm text-emerald-600">{ok}</div> : null}
        <form onSubmit={onSubmit} className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select label="Company" value={companyDocId} onChange={setCompanyDocId} options={companies.map((c) => ({ value: c._id, label: c.name }))} required disabled={!canSelectCompany} placeholder={canSelectCompany ? "Choose company..." : "Company selected by role"} />
          <Field label="Region ID" value={form.regionId} onChange={(v) => setField("regionId", v)} required />
          <Field label="Region Name" value={form.name} onChange={(v) => setField("name", v)} required />
          <Select label="Warehouse Name" value={form.warehouseDocId} onChange={(v) => setField("warehouseDocId", v)} options={filteredWarehouses.map((w) => ({ value: w._id, label: w.name }))} required />
          <Select label="Status" value={form.status} onChange={(v) => setField("status", v)} options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} />
          <div className="md:col-span-2"><button className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm">Save Region</button></div>
        </form>
      </div>
    </AdminShell>
  );
}

function Label({ children }) { return <div className="text-sm font-medium text-zinc-800">{children}</div>; }
function Field({ label, value, onChange, required = false }) { return <div><Label>{label}</Label><input required={required} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2" /></div>; }
function Select({ label, value, onChange, options, required = false, disabled = false, placeholder = "Choose..." }) { return <div><Label>{label}</Label><select required={required} disabled={disabled} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 disabled:bg-zinc-100 disabled:text-zinc-600"><option value="">{placeholder}</option>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>; }