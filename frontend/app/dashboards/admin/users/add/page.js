"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { apiFetch } from "../../../../lib/api";

const roles = [
  "admin", "CEO", "Managing Director", "Warehouse Manager", "Account Officer", "HR Assistant", "Cashier", "KPO",
  "National Sale Manager", "Regional Sale Manager", "Zone Sale Manager", "Territory Sale Manager", "Distributor",
  "Field Sale Manager", "Order Booker", "Salesman", "Delivery Boy", "customer", "Brand Manager",
];

const roleFields = {
  admin: [],
  CEO: [],
  "Managing Director": [],
  "Warehouse Manager": ["warehouseName"],
  "Account Officer": ["warehouseName"],
  "HR Assistant": ["warehouseName"],
  Cashier: ["warehouseName"],
  KPO: ["warehouseName"],
  "National Sale Manager": [],
  "Regional Sale Manager": ["warehouseName", "regionName"],
  "Zone Sale Manager": ["warehouseName", "regionName", "zoneName"],
  "Territory Sale Manager": ["warehouseName", "regionName", "zoneName", "territoryName"],
  Distributor: ["warehouseName", "regionName", "zoneName", "territoryName"],
  "Field Sale Manager": ["warehouseName", "regionName", "zoneName", "territoryName", "fieldName"],
  "Order Booker": ["warehouseName", "regionName", "zoneName", "territoryName", "fieldName"],
  Salesman: ["warehouseName", "regionName", "zoneName", "territoryName", "fieldName"],
  "Delivery Boy": ["warehouseName", "regionName", "zoneName", "territoryName", "fieldName"],
  customer: ["businessType", "businessName", "warehouseName", "regionName", "zoneName", "territoryName", "fieldName"],
  "Brand Manager": ["businessType", "businessName", "warehouseName", "regionName", "zoneName", "territoryName", "fieldName"],
};

const commonFields = ["fullName", "email", "mobileNumber", "cnicNo", "password", "address"];

function validatePassword(value) {
  if (!value || value.length < 8) return "Password must be at least 8 characters long.";
  if (!/[0-9]/.test(value)) return "Password must include at least one number.";
  if (!/[^A-Za-z0-9]/.test(value)) return "Password must include at least one symbol.";
  return "";
}

export default function AddUserPage() {
  const [rows, setRows] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [regions, setRegions] = useState([]);
  const [zones, setZones] = useState([]);
  const [areas, setAreas] = useState([]);
  const [role, setRole] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ userId: "01" });

  useEffect(() => {
    (async () => {
      const [usersRes, whRes, regionRes, zoneRes, areaRes] = await Promise.all([
        apiFetch("/users"), apiFetch("/warehouses"), apiFetch("/regions"), apiFetch("/zones"), apiFetch("/areas"),
      ]);
      setRows(usersRes.users || []);
      setWarehouses(whRes.warehouses || []);
      setRegions(regionRes.regions || []);
      setZones(zoneRes.zones || []);
      setAreas(areaRes.areas || []);
    })().catch((e) => setErr(e.message || "Failed to load form"));
  }, []);

  const nextId = useMemo(() => String(rows.length + 1).padStart(2, "0"), [rows]);
  useEffect(() => setForm((s) => ({ ...s, userId: nextId })), [nextId]);

  const selectedWarehouse = warehouses.find((x) => x.warehouseId === form.warehouseId);
  const filteredRegions = regions.filter((x) => !form.warehouseId || x.companyId === selectedWarehouse?.companyId);
  const filteredZones = zones.filter((x) => (!form.warehouseId || x.warehouseId === form.warehouseId) && (!form.regionId || x.regionId === form.regionId));
  const filteredAreas = areas.filter((x) => (!form.warehouseId || x.warehouseId === form.warehouseId) && (!form.regionId || x.regionId === form.regionId) && (!form.zoneId || x.zoneId === form.zoneId));

  function setField(k, v) { setForm((s) => ({ ...s, [k]: v })); }

  async function onSubmit(e) {
    e.preventDefault();
    setErr(""); setOk("");
    const pErr = validatePassword(form.password);
    if (pErr) return setErr(pErr);
    setSaving(true);
    try {
      await apiFetch("/users", {
        method: "POST",
        body: {
          ...form,
          role,
          mobile: form.mobileNumber,
          fullName: form.fullName,
          customerId: form.userId,
        },
      });
      setOk(`✅ ${role} created with ID ${form.userId}`);
      setRows((s) => [...s, { _id: Date.now() }]);
      setForm({ userId: String(rows.length + 2).padStart(2, "0") });
      setRole("");
    } catch (e2) {
      setErr(e2.message || "Failed to create user");
    } finally { setSaving(false); }
  }

  const fields = [...(roleFields[role] || []), ...commonFields];

  return (
    <AdminShell title="Add User" user={null}>
      <div className="rounded-2xl bg-white border shadow-sm p-5">
        <div className="text-xl font-semibold">Add AIM Hygienic User</div>
        <div className="text-sm text-zinc-500 mt-1">Only configured roles are available. User ID is auto-generated.</div>
        {err ? <div className="mt-3 text-sm text-red-600">{err}</div> : null}
        {ok ? <div className="mt-3 text-sm text-emerald-600">{ok}</div> : null}

        <form className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={onSubmit}>
          <Select label="Role" value={role} onChange={(v) => setRole(v)} options={roles} required />
          <Input label="Auto User ID" value={form.userId || ""} readOnly />

          {fields.includes("warehouseName") ? <WarehouseSelect warehouses={warehouses} form={form} setField={setField} /> : null}
          {fields.includes("regionName") ? <RegionSelect rows={filteredRegions} form={form} setField={setField} /> : null}
          {fields.includes("zoneName") ? <ZoneSelect rows={filteredZones} form={form} setField={setField} /> : null}
          {fields.includes("territoryName") ? <AreaSelect label="Territory Name" rows={filteredAreas} form={form} setField={setField} field="territory" /> : null}
          {fields.includes("fieldName") ? <AreaSelect label="Field Name" rows={filteredAreas} form={form} setField={setField} field="field" /> : null}
          {fields.includes("businessType") ? <Input label="Business Type" value={form.businessType || ""} onChange={(v) => setField("businessType", v)} required /> : null}
          {fields.includes("businessName") ? <Input label="Business Name" value={form.businessName || ""} onChange={(v) => setField("businessName", v)} required /> : null}

          {commonFields.map((field) => (
            <Input key={field} label={field.replace(/([A-Z])/g, " $1").replace(/^./, (x) => x.toUpperCase())} value={form[field] || ""} onChange={(v) => setField(field, v)} type={field === "password" ? "password" : "text"} required />
          ))}

          <div className="md:col-span-2">
            <button disabled={!role || saving} className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm disabled:opacity-60">{saving ? "Saving..." : "Save User"}</button>
          </div>
        </form>
      </div>
    </AdminShell>
  );
}

function Input({ label, value, onChange, type = "text", required = false, readOnly = false }) {
  return <div><div className="text-sm font-medium">{label}</div><input readOnly={readOnly} className="mt-1 w-full rounded-xl border px-3 py-2" type={type} value={value} onChange={(e) => onChange?.(e.target.value)} required={required} /></div>;
}
function Select({ label, value, onChange, options, required = false }) {
  return <div><div className="text-sm font-medium">{label}</div><select className="mt-1 w-full rounded-xl border px-3 py-2" value={value} onChange={(e) => onChange(e.target.value)} required={required}><option value="">Choose...</option>{options.map((v) => <option key={v} value={v}>{v}</option>)}</select></div>;
}
function WarehouseSelect({ warehouses, form, setField }) {
  return <Select label="Warehouse Name" value={form.warehouseId || ""} onChange={(id) => { const x = warehouses.find((w) => w.warehouseId === id); setField("warehouseId", x?.warehouseId || ""); setField("warehouseName", x?.name || ""); }} options={warehouses.map((w) => w.warehouseId)} />;
}
function RegionSelect({ rows, form, setField }) {
  return <Select label="Region Name" value={form.regionId || ""} onChange={(id) => { const x = rows.find((w) => w.regionId === id); setField("regionId", x?.regionId || ""); setField("regionName", x?.name || ""); }} options={rows.map((w) => w.regionId)} />;
}
function ZoneSelect({ rows, form, setField }) {
  return <Select label="Zone Name" value={form.zoneId || ""} onChange={(id) => { const x = rows.find((w) => w.zoneId === id); setField("zoneId", x?.zoneId || ""); setField("zoneName", x?.name || ""); }} options={rows.map((w) => w.zoneId)} />;
}
function AreaSelect({ label, rows, form, setField, field }) {
  const valueKey = `${field}Id`;
  return <Select label={label} value={form[valueKey] || ""} onChange={(id) => { const x = rows.find((w) => w.areaId === id); setField(valueKey, x?.areaId || ""); setField(`${field}Name`, x?.name || ""); }} options={rows.map((w) => w.areaId)} />;
}
