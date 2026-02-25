"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { apiFetch } from "../../../../lib/api";

const types = ["oil_change", "oil_filter", "car_wash", "tyre", "brake", "battery", "routine", "accidental", "other"];

function ToastStack({ items, onClose }) {
  return (
    <div className="fixed top-4 right-4 z-[70] space-y-2 w-[360px]">
      {items.map((t) => (
        <div key={t.id} className="rounded-xl border bg-white shadow-md overflow-hidden">
          <div className="px-3 py-3 flex items-start gap-2 text-sm">
            <span>{t.icon}</span>
            <div className="flex-1 text-zinc-800">{t.message}</div>
            <button className="text-zinc-400" onClick={() => onClose(t.id)}>✕</button>
          </div>
          <div className="h-1" style={{ background: t.color }} />
        </div>
      ))}
    </div>
  );
}

async function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read selected file"));
    reader.readAsDataURL(file);
  });
}

async function uploadProof(file, payload) {
  if (!file) throw new Error("Proof image is required");
  const fileBase64 = await fileToDataUrl(file);
  const result = await apiFetch("/uploads/vehicle-proof", {
    method: "POST",
    body: { ...payload, contentType: file.type || "image/jpeg", fileBase64 },
  });
  return result.publicUrl;
}

function vehicleLabel(vehicle) {
  return `${vehicle.registrationNo || "No-Reg"} · ${vehicle.make || ""} ${vehicle.model || ""}${vehicle.assignedUserName ? ` · ${vehicle.assignedUserName}` : ""}`.trim();
}

function renderProof(url, label) {
  if (!url) return <span className="text-zinc-400">-</span>;
  return (
    <a href={url} target="_blank" rel="noreferrer" className="inline-flex flex-col gap-1 text-emerald-700 hover:underline">
      <img src={url} alt={label} className="h-12 w-16 object-cover rounded border" />
      <span className="text-xs">View</span>
    </a>
  );
}

export default function MaintenancePage() {
  const [vehicles, setVehicles] = useState([]);
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const [form, setForm] = useState({ vehicleId: "", date: "", maintenanceType: "oil_change", cost: "", vendor: "", notes: "" });
  const [proof, setProof] = useState(null);

  function addToast(message, type = "info", sticky = false) {
    const style = type === "success" ? { icon: "✅", color: "#22c55e" } : type === "error" ? { icon: "❌", color: "#ef4444" } : type === "warn" ? { icon: "⚠️", color: "#f59e0b" } : { icon: "ℹ️", color: "#0ea5e9" };
    const id = crypto.randomUUID();
    setToasts((s) => [{ id, message, ...style }, ...s].slice(0, 5));
    if (!sticky) {
      const timer = setTimeout(() => closeToast(id), 2800);
      timers.current.set(id, timer);
    }
    return id;
  }

  function closeToast(id) {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    setToasts((s) => s.filter((t) => t.id !== id));
  }

  const vehiclesMap = useMemo(() => {
    const map = new Map();
    vehicles.forEach((v) => map.set(v._id, v));
    return map;
  }, [vehicles]);

  const load = async () => {
    const [v, m] = await Promise.all([apiFetch("/vehicles"), apiFetch("/vehicle-management/maintenance")]);
    setVehicles(v.vehicles || []);
    setRows(m.maintenance || []);
  };

  useEffect(() => {
    load().catch(() => addToast("Failed to load maintenance data", "error"));
    return () => {
      for (const t of timers.current.values()) clearTimeout(t);
      timers.current.clear();
    };
  }, []);

  async function save() {
    setSaving(true);
    const pending = addToast("Saving maintenance record...", "warn", true);

    try {
      if (!form.vehicleId || !form.date || !form.maintenanceType || !form.cost) throw new Error("Please fill required fields");
      const requiresProof = ["oil_change", "car_wash"].includes(form.maintenanceType);

      let proofUrl = "";
      if (proof) {
        proofUrl = await uploadProof(proof, {
          vehicleId: form.vehicleId,
          entity: "vehicle-maintenance",
          recordId: crypto.randomUUID(),
          slot: "proof",
          date: form.date,
        });
      } else if (requiresProof) {
        throw new Error("Proof image is required for Oil Change and Car Wash");
      }

      await apiFetch("/vehicle-management/maintenance", {
        method: "POST",
        body: { ...form, cost: Number(form.cost || 0), proofUrl },
      });

      await load();
      setForm({ vehicleId: "", date: "", maintenanceType: "oil_change", cost: "", vendor: "", notes: "" });
      setProof(null);
      closeToast(pending);
      addToast("Maintenance saved successfully", "success");
    } catch (e) {
      closeToast(pending);
      addToast(e.message || "Failed to save maintenance", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell title="Vehicle Maintenance" user={null}>
      <div className="rounded-2xl border bg-white p-4">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <select value={form.vehicleId} onChange={(e) => setForm((s) => ({ ...s, vehicleId: e.target.value }))} className="border rounded-xl px-2 py-2">
            <option value="">Vehicle</option>
            {vehicles.map((v) => <option key={v._id} value={v._id}>{vehicleLabel(v)}</option>)}
          </select>
          <input type="date" value={form.date} onChange={(e) => setForm((s) => ({ ...s, date: e.target.value }))} className="border rounded-xl px-2 py-2" />
          <select value={form.maintenanceType} onChange={(e) => setForm((s) => ({ ...s, maintenanceType: e.target.value }))} className="border rounded-xl px-2 py-2">
            {types.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input type="number" placeholder="Cost" value={form.cost} onChange={(e) => setForm((s) => ({ ...s, cost: e.target.value }))} className="border rounded-xl px-2 py-2" />
          <input placeholder="Vendor" value={form.vendor} onChange={(e) => setForm((s) => ({ ...s, vendor: e.target.value }))} className="border rounded-xl px-2 py-2" />
          <input placeholder="Notes" value={form.notes} onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))} className="border rounded-xl px-2 py-2" />
          <input type="file" accept="image/*" onChange={(e) => {
            setProof(e.target.files?.[0] || null);
            if (e.target.files?.[0]) addToast("Proof file selected", "info");
          }} />
          <button type="button" onClick={save} disabled={saving} className="bg-emerald-600 text-white rounded-xl px-3 py-2 disabled:opacity-70">{saving ? "Saving..." : "Save"}</button>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-4 mt-3 overflow-auto">
        <div className="font-semibold mb-2">Vehicle Maintenance Ledger</div>
        <table className="min-w-[1000px] w-full text-sm">
          <thead>
            <tr className="text-left bg-zinc-50">
              <th className="px-2 py-2 border">Date</th>
              <th className="px-2 py-2 border">Vehicle / User</th>
              <th className="px-2 py-2 border">Type</th>
              <th className="px-2 py-2 border">Odometer</th>
              <th className="px-2 py-2 border">Vendor</th>
              <th className="px-2 py-2 border">Cost</th>
              <th className="px-2 py-2 border">Reference</th>
              <th className="px-2 py-2 border">Notes</th>
              <th className="px-2 py-2 border">Proof</th>
              <th className="px-2 py-2 border">Receipt</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const v = vehiclesMap.get(r.vehicleId) || {};
              return (
                <tr key={r._id} className="align-top">
                  <td className="px-2 py-2 border">{new Date(r.date).toLocaleDateString()}</td>
                  <td className="px-2 py-2 border">{vehicleLabel(v)}</td>
                  <td className="px-2 py-2 border">{r.maintenanceType}</td>
                  <td className="px-2 py-2 border">{r.odometer || "-"}</td>
                  <td className="px-2 py-2 border">{r.vendor || "-"}</td>
                  <td className="px-2 py-2 border">{r.cost || 0}</td>
                  <td className="px-2 py-2 border">{r.referenceNo || "-"}</td>
                  <td className="px-2 py-2 border">{r.notes || "-"}</td>
                  <td className="px-2 py-2 border">{renderProof(r.proofUrl, "maintenance proof")}</td>
                  <td className="px-2 py-2 border">{renderProof(r.receiptUrl, "maintenance receipt")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ToastStack items={toasts} onClose={closeToast} />
    </AdminShell>
  );
}
