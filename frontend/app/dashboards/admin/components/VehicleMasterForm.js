"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../../lib/api";
import { ToastStack, useToastStack } from "../vehicle-management/components/ToastStick";

const TYPE_OPTIONS = ["Car", "Suzuki", "Shahzor", "Truck", "Container", "Pickup", "Van", "Bike", "Other"];
const FUEL_OPTIONS = ["Petrol", "Diesel", "CNG", "Hybrid", "Electric"];

export default function VehicleMasterForm({ onSaved }) {
  const [lookups, setLookups] = useState({ regions: [], zones: [], areas: [], fields: [], users: [] });
  const [submitting, setSubmitting] = useState(false);
  const { toasts, addToast, closeToast } = useToastStack();
  const [form, setForm] = useState({
    vehicleId: "", type: "Car", make: "", model: "", year: "", nickname: "", registrationNo: "", engineNo: "", chassisNo: "", color: "",
    ownershipType: "company", purchaseDate: "", purchasePrice: "", insuranceProvider: "", insuranceExpiry: "", tokenExpiry: "", fitnessExpiry: "", permitExpiry: "",
    regionId: "", zoneId: "", areaId: "", fieldId: "", assignedUserId: "", assignmentStartDate: "", defaultDriverName: "",
    fuelType: "Petrol", tankCapacity: "", odometerUnit: "KM", currentOdometer: "", expectedKmPerLiter: "", status: "Active", notes: "",
  });

  useEffect(() => {
    Promise.all([apiFetch("/regions"), apiFetch("/zones"), apiFetch("/areas"), apiFetch("/fields"), apiFetch("/users")])
      .then(([regions, zones, areas, fields, users]) => {
        setLookups({ regions: regions.regions || [], zones: zones.zones || [], areas: areas.areas || [], fields: fields.fields || [], users: users.users || [] });
      })
      .catch((e) => addToast(e.message || "Failed to load form lookups", "error"));

  }, []);

  const selectedRegion = lookups.regions.find((r) => r._id === form.regionId);
  const selectedZone = lookups.zones.find((z) => z._id === form.zoneId);

  const zones = lookups.zones.filter((z) => !selectedRegion || String(z.regionId || "") === String(selectedRegion.regionId || "") || String(z.regionId || "") === String(selectedRegion._id || ""));
  const areas = lookups.areas.filter((a) => !selectedZone || String(a.zoneId || "") === String(selectedZone.zoneId || "") || String(a.zoneId || "") === String(selectedZone._id || ""));
  const users = lookups.users.filter((u) => String(u.role || "").toLowerCase() !== "customer");

  function setField(key, value) {
    setForm((s) => {
      if (key === "regionId") return { ...s, regionId: value, zoneId: "", areaId: "" };
      if (key === "zoneId") return { ...s, zoneId: value, areaId: "" };
      return { ...s, [key]: value };
    });
  }

  async function submit(e) {
    e.preventDefault();
    setSubmitting(true);
    const pending = addToast("Promise is pending", "pending", true);

    try {
      const region = selectedRegion;
      const zone = selectedZone;
      const area = lookups.areas.find((a) => a._id === form.areaId);
      const field = lookups.fields.find((f) => f._id === form.fieldId);
      const user = users.find((u) => u._id === form.assignedUserId);

      const payload = {
        ...form,
        vehicleId: String(form.vehicleId || "").trim() || undefined,
        year: Number(form.year || 0),
        purchasePrice: Number(form.purchasePrice || 0),
        tankCapacity: Number(form.tankCapacity || 0),
        currentOdometer: Number(form.currentOdometer || 0),
        expectedKmPerLiter: Number(form.expectedKmPerLiter || 0),
        regionId: region?.regionId || "",
        regionName: region?.name || "",
        zoneId: zone?.zoneId || "",
        zoneName: zone?.name || "",
        areaId: area?.areaId || "",
        areaName: area?.name || "",
        fieldId: field?.fieldId || "",
        fieldName: field?.name || "",
        assignedUserName: user?.fullName || user?.name || user?.username || "",
      };

      const res = await apiFetch("/vehicles", { method: "POST", body: payload });
      closeToast(pending);
      addToast("Vehicle saved successfully", "success");
      addToast("You can now add trips, refuels, and maintenance for this vehicle.", "info");

      setForm({
        vehicleId: "", type: "Car", make: "", model: "", year: "", nickname: "", registrationNo: "", engineNo: "", chassisNo: "", color: "",
        ownershipType: "company", purchaseDate: "", purchasePrice: "", insuranceProvider: "", insuranceExpiry: "", tokenExpiry: "", fitnessExpiry: "", permitExpiry: "",
        regionId: "", zoneId: "", areaId: "", fieldId: "", assignedUserId: "", assignmentStartDate: "", defaultDriverName: "",
        fuelType: "Petrol", tankCapacity: "", odometerUnit: "KM", currentOdometer: "", expectedKmPerLiter: "", status: "Active", notes: "",
      });

      if (onSaved) onSaved(res.vehicle);
    } catch (e2) {
      closeToast(pending);
      addToast(e2.message || "Failed to save vehicle", "error");
      addToast("Please ensure registration, engine and chassis numbers are unique.", "warn");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Select label="Vehicle Type" value={form.type} onChange={(v) => setField("type", v)} options={TYPE_OPTIONS} />
        <Field label="Make" value={form.make} onChange={(v) => setField("make", v)} required />
        <Field label="Model" value={form.model} onChange={(v) => setField("model", v)} required />
        <Field label="Model Year" type="number" value={form.year} onChange={(v) => setField("year", v)} required />
        <Field label="Nickname" value={form.nickname} onChange={(v) => setField("nickname", v)} />
        <Field label="Registration No" value={form.registrationNo} onChange={(v) => setField("registrationNo", v)} required />
        <Field label="Engine No" value={form.engineNo} onChange={(v) => setField("engineNo", v)} required />
        <Field label="Chassis No" value={form.chassisNo} onChange={(v) => setField("chassisNo", v)} required />
        <Field label="Color" value={form.color} onChange={(v) => setField("color", v)} />
        <Select label="Ownership" value={form.ownershipType} onChange={(v) => setField("ownershipType", v)} options={[{ label: "Company Owned", value: "company" }, { label: "Rented/Leased", value: "leased" }, { label: "Employee Owned", value: "employee" }]} />
        <Select label="Region" value={form.regionId} onChange={(v) => setField("regionId", v)} options={lookups.regions.map((r) => ({ label: r.name, value: r._id }))} required />
        <Select label="Zone" value={form.zoneId} onChange={(v) => setField("zoneId", v)} options={zones.map((z) => ({ label: z.name, value: z._id }))} required />
        <Select label="Territory" value={form.areaId} onChange={(v) => setField("areaId", v)} options={areas.map((a) => ({ label: a.name, value: a._id }))} required />
        <Select label="Assigned User" value={form.assignedUserId} onChange={(v) => setField("assignedUserId", v)} options={users.map((u) => ({ label: `${u.fullName || u.name || u.username} (${u.role || "User"})`, value: u._id }))} />
        <Select label="Fuel Type" value={form.fuelType} onChange={(v) => setField("fuelType", v)} options={FUEL_OPTIONS} required />
        <Field label="Current Odometer" type="number" value={form.currentOdometer} onChange={(v) => setField("currentOdometer", v)} required />
        <Field label="Expected KM/L" type="number" value={form.expectedKmPerLiter} onChange={(v) => setField("expectedKmPerLiter", v)} />
        <Select label="Status" value={form.status} onChange={(v) => setField("status", v)} options={["Active", "Inactive", "Under Maintenance", "Sold"]} />
        <div className="md:col-span-3"><Field label="Notes" value={form.notes} onChange={(v) => setField("notes", v)} /></div>
        <div className="md:col-span-3"><button disabled={submitting} className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm disabled:opacity-70">{submitting ? "Saving..." : "Save Vehicle"}</button></div>
      </form>
      <ToastStack items={toasts} onClose={closeToast} />
    </>
  );
}

function Field({ label, value, onChange, type = "text", required = false }) {
  return <div><div className="text-sm font-medium">{label}</div><input required={required} type={type} value={value || ""} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" /></div>;
}

function Select({ label, value, onChange, options = [], required = false }) {
  const normalized = options.map((o) => (typeof o === "string" ? { label: o, value: o } : o));
  return <div><div className="text-sm font-medium">{label}</div><select required={required} value={value || ""} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"><option value="">Select...</option>{normalized.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>;
}