"use client";

import { useEffect, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { apiFetch } from "../../../../lib/api";

export default function PriceChangePage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(null);

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const data = await apiFetch("/products");
      setRows(data.products || []);
    } catch (e) {
      setErr(e.message || "Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function startEdit(row) {
    setEditId(row._id);
    setEditForm({ ...row });
  }

  async function onSave() {
    try {
      const data = await apiFetch(`/products/${editId}`, {
        method: "PUT",
        body: {
          ...editForm,
          retailPrice: Number(editForm.retailPrice || 0),
          wholesalePrice: Number(editForm.wholesalePrice || 0),
          tradePrice: Number(editForm.tradePrice || 0),
          taxablePrice: Number(editForm.taxablePrice || 0),
          costPrice: Number(editForm.costPrice || 0),
          customerPrice: Number(editForm.wholesalePrice || 0),
        },
      });
      setRows((s) => s.map((r) => (r._id === editId ? data.product : r)));
      setEditId(null);
      setEditForm(null);
    } catch (e) {
      alert(e.message || "Update failed");
    }
  }

  return (
    <AdminShell title="Price Change" user={null}>
      <div className="rounded-2xl bg-white border shadow-sm p-5">
        <div className="text-xl font-semibold text-zinc-900">Price Change</div>
        <div className="text-sm text-zinc-500 mt-1">Update current pricing fields for any product.</div>

        {err ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div> : null}

        <div className="mt-5 overflow-auto rounded-xl border">
          <table className="min-w-[1100px] w-full text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="text-left px-3 py-2 border-b">Product ID</th>
                <th className="text-left px-3 py-2 border-b">Name</th>
                <th className="text-left px-3 py-2 border-b">Category</th>
                <th className="text-left px-3 py-2 border-b">Retail Price</th>
                <th className="text-left px-3 py-2 border-b">Wholesale Price</th>
                <th className="text-left px-3 py-2 border-b">Trade Price</th>
                <th className="text-left px-3 py-2 border-b">Taxable Price</th>
                <th className="text-left px-3 py-2 border-b">Cost Price</th>
                <th className="text-left px-3 py-2 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="px-3 py-6 text-center text-zinc-500">Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={9} className="px-3 py-6 text-center text-zinc-500">No products found</td></tr>
              ) : (
                rows.map((row) => (
                  <tr key={row._id} className="hover:bg-zinc-50">
                    <td className="px-3 py-2 border-b">{row.productId}</td>
                    <td className="px-3 py-2 border-b">{row.name}</td>
                    <td className="px-3 py-2 border-b">{row.category}</td>
                    <td className="px-3 py-2 border-b">{row.retailPrice ?? 0}</td>
                    <td className="px-3 py-2 border-b">{row.wholesalePrice ?? 0}</td>
                    <td className="px-3 py-2 border-b">{row.tradePrice ?? 0}</td>
                    <td className="px-3 py-2 border-b">{row.taxablePrice ?? 0}</td>
                    <td className="px-3 py-2 border-b">{row.costPrice ?? 0}</td>
                    <td className="px-3 py-2 border-b">
                      <button
                        onClick={() => startEdit(row)}
                        className="rounded-lg border px-3 py-1.5 text-xs hover:bg-zinc-50"
                      >
                        Edit
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
          <div className="text-lg font-semibold text-zinc-900">Update Prices</div>
          <button onClick={onClose} className="rounded-xl border px-3 py-2 text-sm hover:bg-zinc-50">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 gap-3">
          <Field label="Product ID" value={form.productId} onChange={() => {}} disabled />
          <Field label="Product Name" value={form.name} onChange={() => {}} disabled />
          <Field label="Retail Price" value={form.retailPrice} onChange={(v) => onChange((s) => ({ ...s, retailPrice: v }))} type="number" />
          <Field label="Wholesale Price" value={form.wholesalePrice} onChange={(v) => onChange((s) => ({ ...s, wholesalePrice: v }))} type="number" />
          <Field label="Trade Price" value={form.tradePrice} onChange={(v) => onChange((s) => ({ ...s, tradePrice: v }))} type="number" />
          <Field label="Taxable Price" value={form.taxablePrice} onChange={(v) => onChange((s) => ({ ...s, taxablePrice: v }))} type="number" />
          <Field label="Cost Price" value={form.costPrice} onChange={(v) => onChange((s) => ({ ...s, costPrice: v }))} type="number" />
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

function Field({ label, value, onChange, type = "text", disabled = false }) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        disabled={disabled}
        className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200 disabled:bg-zinc-100"
      />
    </div>
  );
}