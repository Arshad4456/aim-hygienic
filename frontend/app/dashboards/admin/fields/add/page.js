"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { apiFetch } from "../../../../lib/api";
import { createFieldCompat } from "../../../../lib/fieldApi";
import useCompanyScope from "../../components/useCompanyScope";

export default function AddFieldPage() {
  const { companies, companyDocId, setCompanyDocId, selectedCompany, canSelectCompany } = useCompanyScope();
  const [warehouses, setWarehouses] = useState([]);
  const [regions, setRegions] = useState([]);
  const [zones, setZones] = useState([]);
  const [territories, setTerritories] = useState([]);

  const [form, setForm] = useState({
    fieldId: "",
    name: "",
    warehouseDocId: "",
    regionDocId: "",
    zoneDocId: "",
    territoryDocId: "",
    status: "active",
  });
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    Promise.all([apiFetch("/warehouses"), apiFetch("/regions"), apiFetch("/zones"), apiFetch("/areas")])
      .then(([w, r, z, t]) => {
        setWarehouses(w.warehouses || []);
        setRegions(r.regions || []);
        setZones(z.zones || []);
        setTerritories(t.areas || []);
      })
      .catch((e) => setErr(e.message));
  }, []);

  const scopedWarehouses = useMemo(
    () => warehouses.filter((w) => !selectedCompany?.companyId || String(w.companyId || "") === String(selectedCompany.companyId || "")),
    [warehouses, selectedCompany],
  );
  const scopedRegions = useMemo(
    () => regions.filter((r) => !selectedCompany?.companyId || String(r.companyId || "") === String(selectedCompany.companyId || "")),
    [regions, selectedCompany],
  );
  const scopedZones = useMemo(
    () => zones.filter((z) => !selectedCompany?.companyId || String(z.companyId || "") === String(selectedCompany.companyId || "")),
    [zones, selectedCompany],
  );
  const scopedTerritories = useMemo(
    () => territories.filter((t) => !selectedCompany?.companyId || String(t.companyId || "") === String(selectedCompany.companyId || "")),
    [territories, selectedCompany],
  );

  const wh = scopedWarehouses.find((x) => x._id === form.warehouseDocId);
  const rg = scopedRegions.find((x) => x._id === form.regionDocId);
  const zn = scopedZones.find((x) => x._id === form.zoneDocId);

  const regionOpts = useMemo(
    () => scopedRegions.filter((r) => !wh || r.warehouseId === wh.warehouseId),
    [scopedRegions, wh],
  );
  const zoneOpts = useMemo(
    () => scopedZones.filter((z) => (!wh || z.warehouseId === wh.warehouseId) && (!rg || z.regionId === rg.regionId)),
    [scopedZones, wh, rg],
  );
  const territoryOpts = useMemo(
    () =>
      scopedTerritories.filter(
        (t) =>
          (!wh || t.warehouseId === wh.warehouseId) &&
          (!rg || t.regionId === rg.regionId) &&
          (!zn || t.zoneId === zn.zoneId),
      ),
    [scopedTerritories, wh, rg, zn],
  );

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setOk("");
    try {
      if (!selectedCompany?.companyId) throw new Error("Please select company");
      const tr = scopedTerritories.find((t) => t._id === form.territoryDocId);
      await createFieldCompat({
        fieldId: form.fieldId,
        name: form.name,
        warehouseId: wh?.warehouseId || "",
        warehouseName: wh?.name || "",
        regionId: rg?.regionId || "",
        regionName: rg?.name || "",
        zoneId: zn?.zoneId || "",
        zoneName: zn?.name || "",
        territoryId: tr?.areaId || "",
        territoryName: tr?.name || "",
        companyId: selectedCompany.companyId,
        companyName: selectedCompany.name,
        status: form.status,
      });
      setOk("✅ Field saved successfully.");
      setForm({ fieldId: "", name: "", warehouseDocId: "", regionDocId: "", zoneDocId: "", territoryDocId: "", status: "active" });
    } catch (e2) {
      setErr(e2.message || "Failed to save field");
    }
  }

  return (
    <AdminShell title="Add Field" user={null}>
      <div className="rounded-2xl bg-white border shadow-sm p-5">
        <div className="text-xl font-semibold">Add Field</div>
        {err ? <div className="mt-3 text-sm text-red-600">{err}</div> : null}
        {ok ? <div className="mt-3 text-sm text-emerald-600">{ok}</div> : null}

        <form onSubmit={submit} className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select label="Company" value={companyDocId} onChange={setCompanyDocId} options={companies.map((c) => ({ value: c._id, label: c.name }))} required disabled={!canSelectCompany} />
          <Field label="Field ID" value={form.fieldId} onChange={(v) => setForm((s) => ({ ...s, fieldId: v }))} required />
          <Field label="Field Name" value={form.name} onChange={(v) => setForm((s) => ({ ...s, name: v }))} required />
          <Select label="Warehouse Name" value={form.warehouseDocId} onChange={(v) => setForm((s) => ({ ...s, warehouseDocId: v, regionDocId: "", zoneDocId: "", territoryDocId: "" }))} options={scopedWarehouses.map((w) => ({ value: w._id, label: w.name }))} required />
          <Select label="Region Name" value={form.regionDocId} onChange={(v) => setForm((s) => ({ ...s, regionDocId: v, zoneDocId: "", territoryDocId: "" }))} options={regionOpts.map((r) => ({ value: r._id, label: r.name }))} required />
          <Select label="Zone Name" value={form.zoneDocId} onChange={(v) => setForm((s) => ({ ...s, zoneDocId: v, territoryDocId: "" }))} options={zoneOpts.map((z) => ({ value: z._id, label: z.name }))} required />
          <Select label="Territory Name" value={form.territoryDocId} onChange={(v) => setForm((s) => ({ ...s, territoryDocId: v }))} options={territoryOpts.map((t) => ({ value: t._id, label: t.name }))} required />
          <Select label="Status" value={form.status} onChange={(v) => setForm((s) => ({ ...s, status: v }))} options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} />
          <div className="md:col-span-2">
            <button className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm">Save Field</button>
          </div>
        </form>
      </div>
    </AdminShell>
  );
}

function Label({ children }) { return <div className="text-sm font-medium text-zinc-800">{children}</div>; }
function Field({ label, value, onChange, required }) { return <div><Label>{label}</Label><input required={required} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2" /></div>; }
function Select({ label, value, onChange, options, required, disabled = false }) { return <div><Label>{label}</Label><select required={required} disabled={disabled} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 disabled:bg-zinc-100 disabled:text-zinc-600"><option value="">Choose...</option>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>; }
