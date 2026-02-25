"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { apiFetch } from "../../../../lib/api";
import { ToastStack, useToastStack } from "../components/ToastStick";

const types = ["oil_change", "oil_filter", "car_wash", "tyre", "brake", "battery", "routine", "accidental", "other"];
const PAGE_SIZE = 20;

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

function paginate(rows, page) {
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  return { totalPages, page: safePage, rows: rows.slice(start, start + PAGE_SIZE) };
}

export default function MaintenancePage() {
  const [vehicles, setVehicles] = useState([]);
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const { toasts, addToast, closeToast } = useToastStack();

  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ search: "", vehicleId: "", maintenanceType: "", from: "", to: "" });

  const [form, setForm] = useState({ vehicleId: "", date: "", maintenanceType: "oil_change", cost: "", vendor: "", notes: "" });
  const [proof, setProof] = useState(null);

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
  }, []);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const v = vehiclesMap.get(r.vehicleId) || {};
      const text = `${vehicleLabel(v)} ${r.maintenanceType || ""} ${r.vendor || ""} ${r.notes || ""}`.toLowerCase();
      const q = filters.search.trim().toLowerCase();
      if (q && !text.includes(q)) return false;
      if (filters.vehicleId && String(r.vehicleId) !== String(filters.vehicleId)) return false;
      if (filters.maintenanceType && String(r.maintenanceType) !== String(filters.maintenanceType)) return false;
      if (filters.from && String(r.date || "").slice(0, 10) < filters.from) return false;
      if (filters.to && String(r.date || "").slice(0, 10) > filters.to) return false;
      return true;
    });
  }, [rows, filters, vehiclesMap]);

  useEffect(() => setPage(1), [filters, rows.length]);
  const pageData = paginate(filteredRows, page);

  async function save() {
    setSaving(true);
    const pending = addToast("Promise is pending", "pending", true);

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

      <div className="rounded-2xl border bg-white p-4 mt-3">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="font-semibold">Vehicle Maintenance Ledger</div>
          <div className="text-xs text-zinc-500">{filteredRows.length} entries · Page {pageData.page} of {pageData.totalPages}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <input value={filters.search} onChange={(e) => setFilters((s) => ({ ...s, search: e.target.value }))} placeholder="Search vehicle / vendor / notes" className="border rounded-lg px-2 py-1.5 text-sm" />
          <select value={filters.vehicleId} onChange={(e) => setFilters((s) => ({ ...s, vehicleId: e.target.value }))} className="border rounded-lg px-2 py-1.5 text-sm">
            <option value="">All vehicles</option>
            {vehicles.map((v) => <option key={v._id} value={v._id}>{vehicleLabel(v)}</option>)}
          </select>
          <select value={filters.maintenanceType} onChange={(e) => setFilters((s) => ({ ...s, maintenanceType: e.target.value }))} className="border rounded-lg px-2 py-1.5 text-sm">
            <option value="">All maintenance types</option>
            {types.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input type="date" value={filters.from} onChange={(e) => setFilters((s) => ({ ...s, from: e.target.value }))} className="border rounded-lg px-2 py-1.5 text-sm" />
          <input type="date" value={filters.to} onChange={(e) => setFilters((s) => ({ ...s, to: e.target.value }))} className="border rounded-lg px-2 py-1.5 text-sm" />
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <button type="button" onClick={() => setPage(1)} disabled={pageData.page <= 1} className="rounded border px-2 py-1 text-xs disabled:opacity-50">Start</button>
          <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={pageData.page <= 1} className="rounded border px-2 py-1 text-xs disabled:opacity-50">Previous</button>
          <button type="button" onClick={() => setPage((p) => Math.min(pageData.totalPages, p + 1))} disabled={pageData.page >= pageData.totalPages} className="rounded border px-2 py-1 text-xs disabled:opacity-50">Next</button>
          <button type="button" onClick={() => setPage(pageData.totalPages)} disabled={pageData.page >= pageData.totalPages} className="rounded border px-2 py-1 text-xs disabled:opacity-50">End</button>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-4 mt-3 overflow-auto">
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
            {pageData.rows.map((r) => {
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