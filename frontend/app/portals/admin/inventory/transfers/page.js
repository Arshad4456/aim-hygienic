"use client";

import { useEffect, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { apiFetch } from "../../../../lib/api";

const statusOptions = ["pending", "approved", "transit-in", "completed"];

export default function StockTransfersPage() {
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({
    productId: "",
    fromWarehouseId: "",
    toWarehouseId: "",
    quantity: "",
    status: "pending",
    note: "",
    driverId: "",
    driverName: "",
    vehicleId: "",
    vehicleName: "",
  });
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    async function load() {
      setErr("");
      try {
        const [productsRes, warehousesRes, transfersRes] = await Promise.all([
          apiFetch("/products"),
          apiFetch("/warehouses"),
          apiFetch("/inventory/transfers"),
        ]);
        setProducts(productsRes.products || []);
        setWarehouses(warehousesRes.warehouses || []);
        setRows(transfersRes.transfers || []);
      } catch (e) {
        setErr(e.message || "Failed to load transfers");
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
      const fromWarehouse = warehouses.find((w) => w._id === form.fromWarehouseId);
      const toWarehouse = warehouses.find((w) => w._id === form.toWarehouseId);
      const data = await apiFetch("/inventory/transfers", {
        method: "POST",
        body: {
          productId: product?.productId || "",
          productName: product?.name || "",
          fromWarehouseId: fromWarehouse?.warehouseId || "",
          fromWarehouseName: fromWarehouse?.name || "",
          toWarehouseId: toWarehouse?.warehouseId || "",
          toWarehouseName: toWarehouse?.name || "",
          quantity: Number(form.quantity || 0),
          status: form.status,
          note: form.note,
          driverId: form.driverId,
          driverName: form.driverName,
          vehicleId: form.vehicleId,
          vehicleName: form.vehicleName,
        },
      });
      setRows((s) => [data.transfer, ...s]);
      setForm({
        productId: "",
        fromWarehouseId: "",
        toWarehouseId: "",
        quantity: "",
        status: "pending",
        note: "",
        driverId: "",
        driverName: "",
        vehicleId: "",
        vehicleName: "",
      });
      setOk("✅ Transfer created.");
    } catch (e2) {
      setErr(e2.message || "Failed to create transfer");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(row) {
    setEditId(row._id);
    setEditForm({ ...row });
  }

  async function onSaveEdit() {
    if (!editForm) return;
    setSaving(true);
    setErr("");
    try {
      const data = await apiFetch(`/inventory/transfers/${editId}`, { method: "PUT", body: editForm });
      setRows((s) => s.map((r) => (r._id === editId ? data.transfer : r)));
      setEditId(null);
      setEditForm(null);
    } catch (e) {
      setErr(e.message || "Failed to update transfer");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell title="Stock Transfers" user={null}>
      <div className="rounded-2xl bg-white border shadow-sm p-5">
        <div className="text-xl font-semibold text-zinc-900">Stock Transfers</div>
        <div className="text-sm text-zinc-500 mt-1">Track warehouse-to-warehouse transfers.</div>

        {err ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div> : null}
        {ok ? <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{ok}</div> : null}

        {loading ? (
          <div className="mt-5 text-sm text-zinc-500">Loading transfers...</div>
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
            <Field label="Quantity" value={form.quantity} onChange={(v) => setField("quantity", v)} type="number" required />
            <div>
              <Label>From Warehouse</Label>
              <select
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                value={form.fromWarehouseId}
                onChange={(e) => setField("fromWarehouseId", e.target.value)}
                required
              >
                <option value="">Choose warehouse...</option>
                {warehouses.map((w) => (
                  <option key={w._id} value={w._id}>{w.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>To Warehouse</Label>
              <select
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                value={form.toWarehouseId}
                onChange={(e) => setField("toWarehouseId", e.target.value)}
                required
              >
                <option value="">Choose warehouse...</option>
                {warehouses.map((w) => (
                  <option key={w._id} value={w._id}>{w.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Status</Label>
              <select
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                value={form.status}
                onChange={(e) => setField("status", e.target.value)}
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <Field label="Driver ID" value={form.driverId} onChange={(v) => setField("driverId", v)} />
            <Field label="Driver Name" value={form.driverName} onChange={(v) => setField("driverName", v)} />
            <Field label="Vehicle ID" value={form.vehicleId} onChange={(v) => setField("vehicleId", v)} />
            <Field label="Vehicle Name" value={form.vehicleName} onChange={(v) => setField("vehicleName", v)} />
            <div className="md:col-span-2">
              <Label>Note</Label>
              <textarea
                className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200"
                rows={2}
                value={form.note}
                onChange={(e) => setField("note", e.target.value)}
              />
            </div>
            <div className="md:col-span-2 flex items-center gap-3">
              <button
                disabled={saving}
                className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Create Transfer"}
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 overflow-auto rounded-xl border">
          <table className="min-w-[1000px] w-full text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="text-left px-3 py-2 border-b">Product</th>
                <th className="text-left px-3 py-2 border-b">From</th>
                <th className="text-left px-3 py-2 border-b">To</th>
                <th className="text-left px-3 py-2 border-b">Qty</th>
                <th className="text-left px-3 py-2 border-b">Status</th>
                <th className="text-left px-3 py-2 border-b">Status Time</th>
                <th className="text-left px-3 py-2 border-b">Note</th>
                <th className="text-left px-3 py-2 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={8} className="px-3 py-6 text-center text-zinc-500">No transfers yet</td></tr>
              ) : (
                rows.map((row) => (
                  <tr key={row._id} className="hover:bg-zinc-50">
                    <td className="px-3 py-2 border-b">{row.productName || row.productId}</td>
                    <td className="px-3 py-2 border-b">{row.fromWarehouseName || row.fromWarehouseId}</td>
                    <td className="px-3 py-2 border-b">{row.toWarehouseName || row.toWarehouseId}</td>
                    <td className="px-3 py-2 border-b">{row.quantity}</td>
                    <td className="px-3 py-2 border-b">{row.status}</td>
                    <td className="px-3 py-2 border-b">
                      {row.statusHistory?.length
                        ? new Date(row.statusHistory[row.statusHistory.length - 1].at).toLocaleString()
                        : row.updatedAt ? new Date(row.updatedAt).toLocaleString() : "-"}
                    </td>
                    <td className="px-3 py-2 border-b">{row.note || "-"}</td>
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
        <EditCard form={editForm} onChange={setEditForm} onClose={() => setEditId(null)} onSave={onSaveEdit} saving={saving} />
      ) : null}
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

function EditCard({ form, onChange, onClose, onSave, saving }) {
  if (!form) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full sm:w-[520px] bg-white shadow-xl flex flex-col">
        <div className="shrink-0 border-b px-4 py-3 flex items-center justify-between">
          <div className="text-lg font-semibold text-zinc-900">Edit Transfer</div>
          <button onClick={onClose} className="rounded-xl border px-3 py-2 text-sm hover:bg-zinc-50">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 gap-3">
          <div>
            <Label>Status</Label>
            <select
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              value={form.status}
              onChange={(e) => onChange((s) => ({ ...s, status: e.target.value }))}
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <Field label="Driver ID" value={form.driverId} onChange={(v) => onChange((s) => ({ ...s, driverId: v }))} />
          <Field label="Driver Name" value={form.driverName} onChange={(v) => onChange((s) => ({ ...s, driverName: v }))} />
          <Field label="Vehicle ID" value={form.vehicleId} onChange={(v) => onChange((s) => ({ ...s, vehicleId: v }))} />
          <Field label="Vehicle Name" value={form.vehicleName} onChange={(v) => onChange((s) => ({ ...s, vehicleName: v }))} />
          <Field label="Note" value={form.note} onChange={(v) => onChange((s) => ({ ...s, note: v }))} />
        </div>
        <div className="shrink-0 border-t p-4 flex items-center gap-3">
          <button
            onClick={onSave}
            disabled={saving}
            className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Update"}
          </button>
          <button onClick={onClose} className="rounded-xl border px-4 py-2 text-sm hover:bg-zinc-50">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}