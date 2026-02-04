"use client";

import { useState } from "react";
import AdminShell from "../components/AdminShell";

const initialWarehouses = [
  {
    id: "WH-001",
    name: "Islamabad Central",
    phone: "+92 51 555 0111",
    address: "I-9 Industrial Area, Islamabad",
  },
  {
    id: "WH-002",
    name: "Lahore Main",
    phone: "+92 42 555 0211",
    address: "Ferozepur Road, Lahore",
  },
];

export default function WarehouseListPage() {
  const [rows, setRows] = useState(initialWarehouses);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(null);

  function startEdit(row) {
    setEditId(row.id);
    setEditForm({ ...row });
  }

  function onDelete(id) {
    if (!confirm("Delete this warehouse?")) return;
    setRows((s) => s.filter((r) => r.id !== id));
  }

  function onSave() {
    setRows((s) => s.map((r) => (r.id === editId ? editForm : r)));
    setEditId(null);
    setEditForm(null);
  }

  return (
    <AdminShell title="Warehouse List" user={null}>
      <div className="rounded-2xl bg-white border shadow-sm p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xl font-semibold text-zinc-900">Warehouses</div>
            <div className="text-sm text-zinc-500 mt-1">Manage warehouse locations.</div>
          </div>
          <a
            href="/dashboards/admin/warehouses/add"
            className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700"
          >
            + Add Warehouse
          </a>
        </div>

        <div className="mt-5 overflow-auto rounded-xl border">
          <table className="min-w-[760px] w-full text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="text-left px-3 py-2 border-b">Warehouse ID</th>
                <th className="text-left px-3 py-2 border-b">Warehouse Name</th>
                <th className="text-left px-3 py-2 border-b">Phone</th>
                <th className="text-left px-3 py-2 border-b">Address</th>
                <th className="text-left px-3 py-2 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-6 text-center text-zinc-500">No warehouses found</td></tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="hover:bg-zinc-50">
                    <td className="px-3 py-2 border-b">{row.id}</td>
                    <td className="px-3 py-2 border-b">{row.name}</td>
                    <td className="px-3 py-2 border-b">{row.phone}</td>
                    <td className="px-3 py-2 border-b">{row.address}</td>
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
          <div className="text-lg font-semibold text-zinc-900">Edit Warehouse</div>
          <button onClick={onClose} className="rounded-xl border px-3 py-2 text-sm hover:bg-zinc-50">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 gap-3">
          <Field label="Warehouse ID" value={form.id} onChange={(v) => onChange((s) => ({ ...s, id: v }))} />
          <Field label="Warehouse Name" value={form.name} onChange={(v) => onChange((s) => ({ ...s, name: v }))} />
          <Field label="Phone" value={form.phone} onChange={(v) => onChange((s) => ({ ...s, phone: v }))} />
          <div>
            <Label>Warehouse Address</Label>
            <textarea
              className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200"
              rows={3}
              value={form.address}
              onChange={(e) => onChange((s) => ({ ...s, address: e.target.value }))}
            />
          </div>
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
