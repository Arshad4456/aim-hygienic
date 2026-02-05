"use client";

import { useEffect, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { apiFetch } from "../../../../lib/api";

const movementTypes = [
  "PURCHASE_IN",
  "TRANSFER_IN",
  "TRANSFER_OUT",
  "SALE_OUT",
  "RETURN_IN",
  "ADJUSTMENT",
];

export default function InventoryLedgerPage() {
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({
    productId: "",
    warehouseId: "",
    quantity: "",
    movementType: "",
    referenceId: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    async function load() {
      setErr("");
      try {
        const [productsRes, warehousesRes, ledgerRes] = await Promise.all([
          apiFetch("/products"),
          apiFetch("/warehouses"),
          apiFetch("/inventory/movements"),
        ]);
        setProducts(productsRes.products || []);
        setWarehouses(warehousesRes.warehouses || []);
        setRows(ledgerRes.movements || []);
      } catch (e) {
        setErr(e.message || "Failed to load inventory data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function setField(key, value) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setOk("");
    setSaving(true);
    try {
      const product = products.find((p) => p._id === form.productId);
      const warehouse = warehouses.find((w) => w._id === form.warehouseId);
      const data = await apiFetch("/inventory/movements", {
        method: "POST",
        body: {
          productId: product?.productId || "",
          productName: product?.name || "",
          warehouseId: warehouse?.warehouseId || "",
          warehouseName: warehouse?.name || "",
          quantity: Number(form.quantity || 0),
          movementType: form.movementType,
          referenceId: form.referenceId,
        },
      });
      setRows((s) => [data.movement, ...s]);
      setForm({ productId: "", warehouseId: "", quantity: "", movementType: "", referenceId: "" });
      setOk("✅ Movement recorded.");
    } catch (e2) {
      setErr(e2.message || "Failed to save movement");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell title="Inventory Ledger" user={null}>
      <div className="rounded-2xl bg-white border shadow-sm p-5">
        <div className="text-xl font-semibold text-zinc-900">Inventory Ledger</div>
        <div className="text-sm text-zinc-500 mt-1">Record every stock movement.</div>

        {err ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div> : null}
        {ok ? <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{ok}</div> : null}

        {loading ? (
          <div className="mt-5 text-sm text-zinc-500">Loading ledger...</div>
        ) : (
          <form onSubmit={onSubmit} className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Product</Label>
              <select
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                value={form.productId}
                onChange={(e) => setField("productId", e.target.value)}
                required
              >
                <option value="">Choose product...</option>
                {products.map((p) => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Warehouse</Label>
              <select
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                value={form.warehouseId}
                onChange={(e) => setField("warehouseId", e.target.value)}
                required
              >
                <option value="">Choose warehouse...</option>
                {warehouses.map((w) => (
                  <option key={w._id} value={w._id}>{w.name}</option>
                ))}
              </select>
            </div>
            <Field label="Quantity (+/-)" value={form.quantity} onChange={(v) => setField("quantity", v)} type="number" required />
            <div>
              <Label>Movement Type</Label>
              <select
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                value={form.movementType}
                onChange={(e) => setField("movementType", e.target.value)}
                required
              >
                <option value="">Select type...</option>
                {movementTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <Field label="Reference ID" value={form.referenceId} onChange={(v) => setField("referenceId", v)} />
            <div className="md:col-span-2 flex items-center gap-3">
              <button
                disabled={saving}
                className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Add Movement"}
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 overflow-auto rounded-xl border">
          <table className="min-w-[900px] w-full text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="text-left px-3 py-2 border-b">Product</th>
                <th className="text-left px-3 py-2 border-b">Warehouse</th>
                <th className="text-left px-3 py-2 border-b">Qty</th>
                <th className="text-left px-3 py-2 border-b">Type</th>
                <th className="text-left px-3 py-2 border-b">Reference</th>
                <th className="text-left px-3 py-2 border-b">Date</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-zinc-500">No movements yet</td></tr>
              ) : (
                rows.map((row) => (
                  <tr key={row._id} className="hover:bg-zinc-50">
                    <td className="px-3 py-2 border-b">{row.productName || row.productId}</td>
                    <td className="px-3 py-2 border-b">{row.warehouseName || row.warehouseId}</td>
                    <td className="px-3 py-2 border-b">{row.quantity}</td>
                    <td className="px-3 py-2 border-b">{row.movementType}</td>
                    <td className="px-3 py-2 border-b">{row.referenceId || "-"}</td>
                    <td className="px-3 py-2 border-b">{row.createdAt ? new Date(row.createdAt).toLocaleString() : "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}

function Label({ children }) {
  return <div className="text-sm font-medium text-zinc-800">{children}</div>;
}

function Field({ label, value, onChange, type = "text", required = false }) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200"
      />
    </div>
  );
}
