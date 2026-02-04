"use client";

import { useMemo, useState } from "react";
import AdminShell from "../components/AdminShell";

const companies = [
  { id: "C-001", name: "AIM Hygienic" },
  { id: "C-002", name: "CleanPro Supplies" },
];

const initialRegions = [
  { id: "R-001", name: "North Islamabad", companyId: "C-001", companyName: "AIM Hygienic" },
  { id: "R-002", name: "Central Lahore", companyId: "C-001", companyName: "AIM Hygienic" },
  { id: "R-003", name: "Karachi South", companyId: "C-002", companyName: "CleanPro Supplies" },
];

export default function RegionListPage() {
  const [companyId, setCompanyId] = useState("");
  const [rows, setRows] = useState(initialRegions);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(null);

  const filtered = useMemo(() => rows.filter((r) => r.companyId === companyId), [rows, companyId]);

  function startEdit(row) {
    setEditId(row.id);
    setEditForm({ ...row });
  }

  function onDelete(id) {
    if (!confirm("Delete this region?")) return;
    setRows((s) => s.filter((r) => r.id !== id));
  }

  function onSave() {
    setRows((s) => s.map((r) => (r.id === editId ? editForm : r)));
    setEditId(null);
    setEditForm(null);
  }

  return (
    <AdminShell title="Region List" user={null}>
      <div className="rounded-2xl bg-white border shadow-sm p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xl font-semibold text-zinc-900">Regions</div>
            <div className="text-sm text-zinc-500 mt-1">Select a company to view its regions.</div>
          </div>
          <a
            href="/dashboards/admin/regions/add"
            className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700"
          >
            + Add Region
          </a>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label>Select Company</Label>
            <select
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
            >
              <option value="">Choose company...</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {!companyId ? (
          <div className="mt-6 rounded-xl border border-dashed px-4 py-6 text-sm text-zinc-500 text-center">
            Please select a company to view regions.
          </div>
        ) : (
          <div className="mt-5 overflow-auto rounded-xl border">
            <table className="min-w-[700px] w-full text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="text-left px-3 py-2 border-b">Region ID</th>
                  <th className="text-left px-3 py-2 border-b">Region Name</th>
                  <th className="text-left px-3 py-2 border-b">Company</th>
                  <th className="text-left px-3 py-2 border-b">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={4} className="px-3 py-6 text-center text-zinc-500">No regions found</td></tr>
                ) : (
                  filtered.map((row) => (
                    <tr key={row.id} className="hover:bg-zinc-50">
                      <td className="px-3 py-2 border-b">{row.id}</td>
                      <td className="px-3 py-2 border-b">{row.name}</td>
                      <td className="px-3 py-2 border-b">{row.companyName}</td>
                      <td className="px-3 py-2 border-b">
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEdit(row)}
                            className="rounded-lg border px-3 py-1.5 text-xs hover:bg-zinc-50"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => onDelete(row.id)}
                            className="rounded-lg border px-3 py-1.5 text-xs hover:bg-zinc-50 text-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editId ? (
        <EditCard form={editForm} onChange={setEditForm} onClose={() => setEditId(null)} onSave={onSave} />
      ) : null}
    </AdminShell>
  );
}

function EditCard({ form, onChange, onClose, onSave }) {
  if (!form) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full sm:w-[520px] bg-white shadow-xl flex flex-col">
        <div className="shrink-0 border-b px-4 py-3 flex items-center justify-between">
          <div className="text-lg font-semibold text-zinc-900">Edit Region</div>
          <button onClick={onClose} className="rounded-xl border px-3 py-2 text-sm hover:bg-zinc-50">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 gap-3">
          <Field label="Region ID" value={form.id} onChange={(v) => onChange((s) => ({ ...s, id: v }))} />
          <Field label="Region Name" value={form.name} onChange={(v) => onChange((s) => ({ ...s, name: v }))} />
          <Field label="Company ID" value={form.companyId} onChange={(v) => onChange((s) => ({ ...s, companyId: v }))} />
          <Field label="Company Name" value={form.companyName} onChange={(v) => onChange((s) => ({ ...s, companyName: v }))} />
        </div>
        <div className="shrink-0 border-t p-4 flex items-center gap-3">
          <button
            onClick={onSave}
            className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700"
          >
            Update
          </button>
          <button onClick={onClose} className="rounded-xl border px-4 py-2 text-sm hover:bg-zinc-50">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function Label({ children }) {
  return <div className="text-sm font-medium text-zinc-800">{children}</div>;
}

function Field({ label, value, onChange }) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200"
      />
    </div>
  );
}
