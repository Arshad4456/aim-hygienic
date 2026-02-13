"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { apiFetch } from "../../../../lib/api";
import {
  AIM_USER_ROLES,
  COMMON_USER_FIELDS,
  FIELD_LABELS,
  ROLE_EXTRA_FIELDS,
  validatePassword,
} from "../roleConfig";

export default function AddUserPage() {
  const [users, setUsers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [regions, setRegions] = useState([]);
  const [zones, setZones] = useState([]);
  const [areas, setAreas] = useState([]);

  const [role, setRole] = useState("");
  const [form, setForm] = useState({ userId: "01" });
  const [showPassword, setShowPassword] = useState(false);

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    (async () => {
      const [usersRes, warehousesRes, regionsRes, zonesRes, areasRes] = await Promise.all([
        apiFetch("/users"),
        apiFetch("/warehouses"),
        apiFetch("/regions"),
        apiFetch("/zones"),
        apiFetch("/areas"),
      ]);
      setUsers(usersRes.users || []);
      setWarehouses(warehousesRes.warehouses || []);
      setRegions(regionsRes.regions || []);
      setZones(zonesRes.zones || []);
      setAreas(areasRes.areas || []);
    })().catch((e) => setErr(e.message || "Failed to load data"));
  }, []);

  const nextUserId = useMemo(() => String((users || []).length + 1).padStart(2, "0"), [users]);
  useEffect(() => {
    setForm((prev) => ({ ...prev, userId: nextUserId }));
  }, [nextUserId]);

  const selectedWarehouse = warehouses.find((x) => x._id === form.warehouseDocId);
  const selectedRegion = regions.find((x) => x._id === form.regionDocId);
  const selectedZone = zones.find((x) => x._id === form.zoneDocId);

  const filteredRegions = regions.filter((r) => {
    if (!selectedWarehouse) return true;
    return !r.companyId || r.companyId === selectedWarehouse.companyId;
  });
  const filteredZones = zones.filter((z) => {
    if (selectedWarehouse && z.warehouseId !== selectedWarehouse.warehouseId) return false;
    if (selectedRegion && z.regionId !== selectedRegion.regionId) return false;
    return true;
  });
  const filteredAreas = areas.filter((a) => {
    if (selectedWarehouse && a.warehouseId !== selectedWarehouse.warehouseId) return false;
    if (selectedRegion && a.regionId !== selectedRegion.regionId) return false;
    if (selectedZone && a.zoneId !== selectedZone.zoneId) return false;
    return true;
  });

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function resetLocationFrom(level) {
    if (level === "warehouse") {
      setForm((prev) => ({
        ...prev,
        regionDocId: "",
        regionId: "",
        regionName: "",
        zoneDocId: "",
        zoneId: "",
        zoneName: "",
        territoryDocId: "",
        territoryId: "",
        territoryName: "",
        fieldDocId: "",
        fieldId: "",
        fieldName: "",
      }));
    }
    if (level === "region") {
      setForm((prev) => ({
        ...prev,
        zoneDocId: "",
        zoneId: "",
        zoneName: "",
        territoryDocId: "",
        territoryId: "",
        territoryName: "",
        fieldDocId: "",
        fieldId: "",
        fieldName: "",
      }));
    }
    if (level === "zone") {
      setForm((prev) => ({
        ...prev,
        territoryDocId: "",
        territoryId: "",
        territoryName: "",
        fieldDocId: "",
        fieldId: "",
        fieldName: "",
      }));
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setOk("");

    if (!role) {
      setErr("Please select a role.");
      return;
    }

    const passError = validatePassword(form.password);
    if (passError) {
      setErr(passError);
      return;
    }

    setSaving(true);
    try {
      await apiFetch("/users", {
        method: "POST",
        body: {
          ...form,
          role,
          mobile: form.mobileNumber,
          userId: form.userId,
          fullName: form.fullName,
        },
      });

      setUsers((prev) => [...prev, { _id: Date.now().toString() }]);
      setOk(`✅ ${role} user created successfully.`);
      setRole("");
      setForm({ userId: String(users.length + 2).padStart(2, "0") });
      setShowPassword(false);
    } catch (e2) {
      setErr(e2.message || "Failed to create user");
    } finally {
      setSaving(false);
    }
  }

  const roleNeeds = ROLE_EXTRA_FIELDS[role] || [];

  return (
    <AdminShell title="Add User" user={null}>
      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="text-xl font-semibold text-zinc-900">Add AIM Hygienic User</div>
        <div className="mt-1 text-sm text-zinc-500">Choose role first. Location dropdowns show names from backend records.</div>

        {err ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div> : null}
        {ok ? <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{ok}</div> : null}

        <form onSubmit={onSubmit} className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <SelectField label="Role" value={role} onChange={setRole} options={AIM_USER_ROLES.map((r) => ({ value: r, label: r }))} required />
          <InputField label="Auto User ID" value={form.userId || ""} readOnly />

          {roleNeeds.includes("warehouse") ? (
            <SelectField
              label="Warehouse Name"
              value={form.warehouseDocId || ""}
              onChange={(docId) => {
                const item = warehouses.find((w) => w._id === docId);
                setForm((prev) => ({
                  ...prev,
                  warehouseDocId: docId,
                  warehouseId: item?.warehouseId || "",
                  warehouseName: item?.name || "",
                }));
                resetLocationFrom("warehouse");
              }}
              options={warehouses.map((w) => ({ value: w._id, label: w.name }))}
            />
          ) : null}

          {roleNeeds.includes("region") ? (
            <SelectField
              label="Region Name"
              value={form.regionDocId || ""}
              onChange={(docId) => {
                const item = regions.find((r) => r._id === docId);
                setForm((prev) => ({
                  ...prev,
                  regionDocId: docId,
                  regionId: item?.regionId || "",
                  regionName: item?.name || "",
                }));
                resetLocationFrom("region");
              }}
              options={filteredRegions.map((r) => ({ value: r._id, label: r.name }))}
            />
          ) : null}

          {roleNeeds.includes("zone") ? (
            <SelectField
              label="Zone Name"
              value={form.zoneDocId || ""}
              onChange={(docId) => {
                const item = zones.find((z) => z._id === docId);
                setForm((prev) => ({
                  ...prev,
                  zoneDocId: docId,
                  zoneId: item?.zoneId || "",
                  zoneName: item?.name || "",
                }));
                resetLocationFrom("zone");
              }}
              options={filteredZones.map((z) => ({ value: z._id, label: z.name }))}
            />
          ) : null}

          {roleNeeds.includes("territory") ? (
            <SelectField
              label="Territory Name"
              value={form.territoryDocId || ""}
              onChange={(docId) => {
                const item = areas.find((a) => a._id === docId);
                setField("territoryDocId", docId);
                setField("territoryId", item?.areaId || "");
                setField("territoryName", item?.name || "");
              }}
              options={filteredAreas.map((a) => ({ value: a._id, label: a.name }))}
            />
          ) : null}

          {roleNeeds.includes("field") ? (
            <SelectField
              label="Field Name"
              value={form.fieldDocId || ""}
              onChange={(docId) => {
                const item = areas.find((a) => a._id === docId);
                setField("fieldDocId", docId);
                setField("fieldId", item?.areaId || "");
                setField("fieldName", item?.name || "");
              }}
              options={filteredAreas.map((a) => ({ value: a._id, label: a.name }))}
            />
          ) : null}

          {roleNeeds.includes("businessType") ? <InputField label="Business Type" value={form.businessType || ""} onChange={(v) => setField("businessType", v)} required /> : null}
          {roleNeeds.includes("businessName") ? <InputField label="Business Name" value={form.businessName || ""} onChange={(v) => setField("businessName", v)} required /> : null}

          {COMMON_USER_FIELDS.filter((f) => f !== "password").map((field) => (
            <InputField
              key={field}
              label={FIELD_LABELS[field] || field}
              value={form[field] || ""}
              onChange={(v) => setField(field, v)}
              required
            />
          ))}

          <PasswordField
            label="Password"
            value={form.password || ""}
            onChange={(v) => setField("password", v)}
            show={showPassword}
            setShow={setShowPassword}
          />

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={saving || !role}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save User"}
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

function InputField({ label, value, onChange, required = false, readOnly = false }) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        value={value}
        readOnly={readOnly}
        required={required}
        onChange={(e) => onChange?.(e.target.value)}
        className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200"
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options, required = false }) {
  return (
    <div>
      <Label>{label}</Label>
      <select
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200"
      >
        <option value="">Choose...</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

function PasswordField({ label, value, onChange, show, setShow }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          required
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full rounded-xl border px-3 py-2 pr-16 outline-none focus:ring-2 focus:ring-emerald-200"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-zinc-700"
        >
          {show ? "Hide" : "Show"}
        </button>
      </div>
    </div>
  );
}
