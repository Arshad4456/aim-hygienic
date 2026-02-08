"use client";

import { useEffect, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { apiFetch } from "../../../../lib/api";

export default function LowStockPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(null);

  useEffect(() => {
    async function load() {
      setErr("");
      setLoading(true);
      try {
        const data = await apiFetch("/inventory/low-stock");
        setRows(data.lowStock || []);
      } catch (e) {
        setErr(e.message || "Failed to load low stock");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function startEdit(row) {
    setEditId(row.productDbId);
    setEditForm({ ...row });
  }

  async function onSaveEdit() {
    if (!editForm) return;
    try {
      const data = await apiFetch(`/products/${editId}`, {
        method: "PUT",
        body: {
          productId: editForm.productId,
          name: editForm.name,
          minStockLevel: editForm.minStockLevel,
        },
      });
      setRows((s) =>
        s.map((r) =>
          r.productDbId === editId
            ? { ...r, minStockLevel: data.product.minStockLevel }
            : r
        )
      );
      setEditId(null);
      setEditForm(null);
    } catch (e) {
      setErr(e.message || "Failed to update min stock");
    }
  }

  return (
    <AdminShell title="Low Stock Alerts" user={null}>
      <div className="rounded-2xl bg-white border shadow-sm p-5">
        <div className="text-xl font-semibold text-zinc-900">Low Stock Alerts</div>
        <div className="text-sm text-zinc-500 mt-1">Products at or below minimum stock.</div>

        {err ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div> : null}

        <div className="mt-5 overflow-auto rounded-xl border">
          <table className="min-w-[900px] w-full text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="text-left px-3 py-2 border-b">Product ID</th>
                <th className="text-left px-3 py-2 border-b">Product Name</th>
                <th className="text-left px-3 py-2 border-b">Warehouse</th>
                <th className="text-left px-3 py-2 border-b">Current Stock</th>
                <th className="text-left px-3 py-2 border-b">Min Stock</th>
                <th className="text-left px-3 py-2 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-zinc-500">Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-zinc-500">No low stock alerts</td></tr>
              ) : (
                rows.map((row) => (
                  <tr key={`${row.productId}-${row.warehouseId}`} className="hover:bg-zinc-50">
                    <td className="px-3 py-2 border-b">{row.productId}</td>
                    <td className="px-3 py-2 border-b">{row.name}</td>
                    <td className="px-3 py-2 border-b text-red-600 font-medium">{row.warehouseName || "-"}</td>
                    <td className="px-3 py-2 border-b">{row.quantity}</td>
                    <td className="px-3 py-2 border-b">{row.minStockLevel}</td>
                    <td className="px-3 py-2 border-b">
                      <button
                        onClick={() => startEdit(row)}
                        className="rounded-lg border px-3 py-1.5 text-xs hover:bg-zinc-50"
                      >
                        Edit Min Stock
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editId ? (
        <EditCard form={editForm} onChange={setEditForm} onClose={() => setEditId(null)} onSave={onSaveEdit} />
      ) : null}
    </AdminShell>
  );
}

function EditCard({ form, onChange, onClose, onSave }) {
  if (!form) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full sm:w-[420px] bg-white shadow-xl flex flex-col">
        <div className="shrink-0 border-b px-4 py-3 flex items-center justify-between">
          <div className="text-lg font-semibold text-zinc-900">Edit Min Stock</div>
          <button onClick={onClose} className="rounded-xl border px-3 py-2 text-sm hover:bg-zinc-50">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 gap-3">
          <Field label="Product ID" value={form.productId} onChange={(v) => onChange((s) => ({ ...s, productId: v }))} />
          <Field label="Product Name" value={form.name} onChange={(v) => onChange((s) => ({ ...s, name: v }))} />
          <Field label="Min Stock Level" value={form.minStockLevel} onChange={(v) => onChange((s) => ({ ...s, minStockLevel: v }))} type="number" />
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

function Field({ label, value, onChange, type = "text" }) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200"
      />
    </div>
  );
}
