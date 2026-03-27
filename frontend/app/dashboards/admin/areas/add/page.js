"use client";
import { useEffect, useMemo, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { apiFetch } from "../../../../lib/api";
import useCompanyScope from "../../components/useCompanyScope";

export default function AddTerritoryPage() {
  const { companies, companyDocId, setCompanyDocId, selectedCompany, canSelectCompany } = useCompanyScope();
  const [warehouses, setWarehouses] = useState([]);
  const [regions, setRegions] = useState([]);
  const [zones, setZones] = useState([]);
  const [form, setForm] = useState({ areaId: "", name: "", warehouseDocId: "", regionDocId: "", zoneDocId: "", status: "active" });
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    Promise.all([apiFetch("/warehouses"), apiFetch("/regions"), apiFetch("/zones")])
      .then(([w, r, z]) => { setWarehouses(w.warehouses || []); setRegions(r.regions || []); setZones(z.zones || []); })
      .catch((e) => setErr(e.message));
  }, []);

  const scopedWarehouses = useMemo(
    () => warehouses.filter((w) => !selectedCompany?.companyId || String(w.companyId || "") === String(selectedCompany.companyId || "")),
    [warehouses, selectedCompany],
  );
  const selectedWh = scopedWarehouses.find((w) => w._id === form.warehouseDocId);
  const filteredRegions = useMemo(
    () => regions.filter((r) => (!selectedCompany?.companyId || String(r.companyId || "") === String(selectedCompany.companyId || "")) && (!selectedWh || r.warehouseId === selectedWh.warehouseId)),
    [regions, selectedCompany, selectedWh],
  );
  const selectedRegion = filteredRegions.find((r) => r._id === form.regionDocId);
  const filteredZones = useMemo(
    () => zones.filter((z) => (!selectedCompany?.companyId || String(z.companyId || "") === String(selectedCompany.companyId || "")) && (!selectedWh || z.warehouseId === selectedWh.warehouseId) && (!selectedRegion || z.regionId === selectedRegion.regionId)),
    [zones, selectedCompany, selectedWh, selectedRegion],
  );

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setOk("");
    try {
      if (!selectedCompany?.companyId) throw new Error("Please select company");
      const z = filteredZones.find((x) => x._id === form.zoneDocId);
      await apiFetch("/areas", {
        method: "POST",
        body: {
          areaId: form.areaId,
          name: form.name,
          warehouseId: selectedWh?.warehouseId || "",
          warehouseName: selectedWh?.name || "",
          regionId: selectedRegion?.regionId || "",
          regionName: selectedRegion?.name || "",
          zoneId: z?.zoneId || "",
          zoneName: z?.name || "",
          companyId: selectedCompany.companyId,
          companyName: selectedCompany.name,
          status: form.status,
        },
      });
      setOk("✅ Territory saved successfully.");
      setForm({ areaId: "", name: "", warehouseDocId: "", regionDocId: "", zoneDocId: "", status: "active" });
    } catch (e2) {
      setErr(e2.message || "Failed to save territory");
    }
  }

  return <AdminShell title="Add Territory" user={null}><div className="rounded-2xl bg-white border shadow-sm p-5"><div className="text-xl font-semibold">Add Territory</div>{err ? <div className="mt-3 text-sm text-red-600">{err}</div> : null}{ok ? <div className="mt-3 text-sm text-emerald-600">{ok}</div> : null}<form onSubmit={submit} className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4"><Select label="Company" value={companyDocId} onChange={setCompanyDocId} options={companies.map((c) => ({ value: c._id, label: c.name }))} required disabled={!canSelectCompany} placeholder={canSelectCompany ? "Choose company..." : "Company selected by role"} /><Field label="Territory ID" value={form.areaId} onChange={(v) => setForm((s) => ({ ...s, areaId: v }))} required /><Field label="Territory Name" value={form.name} onChange={(v) => setForm((s) => ({ ...s, name: v }))} required /><Select label="Warehouse Name" value={form.warehouseDocId} onChange={(v) => setForm((s) => ({ ...s, warehouseDocId: v, regionDocId: "", zoneDocId: "" }))} options={scopedWarehouses.map((w) => ({ value: w._id, label: w.name }))} required /><Select label="Region Name" value={form.regionDocId} onChange={(v) => setForm((s) => ({ ...s, regionDocId: v, zoneDocId: "" }))} options={filteredRegions.map((r) => ({ value: r._id, label: r.name }))} required /><Select label="Zone Name" value={form.zoneDocId} onChange={(v) => setForm((s) => ({ ...s, zoneDocId: v }))} options={filteredZones.map((z) => ({ value: z._id, label: z.name }))} required /><Select label="Status" value={form.status} onChange={(v) => setForm((s) => ({ ...s, status: v }))} options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} /><div className="md:col-span-2"><button className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm">Save Territory</button></div></form></div></AdminShell>;
}
function Label({ children }) { return <div className="text-sm font-medium text-zinc-800">{children}</div>; }
function Field({ label, value, onChange, required }) { return <div><Label>{label}</Label><input required={required} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2" /></div>; }
function Select({ label, value, onChange, options, required = false, disabled = false, placeholder = "Choose..." }) { return <div><Label>{label}</Label><select required={required} disabled={disabled} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 disabled:bg-zinc-100 disabled:text-zinc-600"><option value="">{placeholder}</option>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>; }
