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
  const [regions, setRegions] = useState([]);
  const [zones, setZones] = useState([]);
  const [areas, setAreas] = useState([]);
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({
    productId: "",
    warehouseId: "",
    regionId: "",
    zoneId: "",
    areaId: "",
    quantity: "",
    movementType: "",
    referenceId: "",
    movementScope: "warehouse",
  });
  const [filterType, setFilterType] = useState("");
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
        const [productsRes, warehousesRes, regionsRes, zonesRes, areasRes, ledgerRes] = await Promise.all([
          apiFetch("/products"),
          apiFetch("/warehouses"),
          apiFetch("/regions"),
          apiFetch("/zones"),
          apiFetch("/areas"),
          apiFetch("/inventory/movements"),
        ]);
        setProducts(productsRes.products || []);
        setWarehouses(warehousesRes.warehouses || []);
        setRegions(regionsRes.regions || []);
        setZones(zonesRes.zones || []);
        setAreas(areasRes.areas || []);
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

  function normalizeQuantity(value, type) {
    const qty = Number(value || 0);
    if (["TRANSFER_OUT", "SALE_OUT"].includes(type)) {
      return -Math.abs(qty);
    }
    return Math.abs(qty);
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setOk("");
    setSaving(true);
    try {
      const product = products.find((p) => p._id === form.productId);
      const warehouse = warehouses.find((w) => w._id === form.warehouseId);
      const region = regions.find((r) => r._id === form.regionId);
      const zone = zones.find((z) => z._id === form.zoneId);
      const area = areas.find((a) => a._id === form.areaId);
      const data = await apiFetch("/inventory/movements", {
        method: "POST",
        body: {
          productId: product?.productId || "",
          productName: product?.name || "",
          warehouseId: warehouse?.warehouseId || "",
          warehouseName: warehouse?.name || "",
          regionId: region?.regionId || "",
          regionName: region?.name || "",
          zoneId: zone?.zoneId || "",
          zoneName: zone?.name || "",
          areaId: area?.areaId || "",
          areaName: area?.name || "",
          movementScope: form.movementScope,
          quantity: normalizeQuantity(form.quantity, form.movementType),
          movementType: form.movementType,
          referenceId: form.referenceId,
        },
      });
      setRows((s) => [data.movement, ...s]);
      setForm({
        productId: "",
        warehouseId: "",
        regionId: "",
        zoneId: "",
        areaId: "",
        quantity: "",
        movementType: "",
        referenceId: "",
        movementScope: "warehouse",
      });
      setOk("✅ Movement recorded.");
    } catch (e2) {
      setErr(e2.message || "Failed to save movement");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(row) {
    setEditId(row._id);
    setEditForm({
      ...row,
      quantity: String(Math.abs(row.quantity || 0)),
      movementScope: row.movementScope || "warehouse",
    });
  }

  async function onSaveEdit() {
    if (!editForm) return;
    setSaving(true);
    setErr("");
    try {
      const data = await apiFetch(`/inventory/movements/${editId}`, {
        method: "PUT",
        body: {
          ...editForm,
          quantity: normalizeQuantity(editForm.quantity, editForm.movementType),
        },
      });
      setRows((s) => s.map((r) => (r._id === editId ? data.movement : r)));
      setEditId(null);
      setEditForm(null);
    } catch (e) {
      setErr(e.message || "Failed to update movement");
    } finally {
      setSaving(false);
    }
  }

  async function clearMovements() {
    if (!confirm("Clear all inventory ledger records? This cannot be undone.")) return;
    try {
      await apiFetch("/inventory/movements/clear", { method: "DELETE" });
      setRows([]);
    } catch (e) {
      setErr(e.message || "Failed to clear ledger");
    }
  }

  function exportPdf() {
    const html = `
      <html>
        <head><title>Inventory Ledger</title></head>
        <body>
          <h2>Inventory Ledger</h2>
          <table border="1" cellpadding="6" cellspacing="0">
            <thead>
              <tr>
                <th>Product</th><th>Warehouse</th><th>Qty</th><th>Type</th><th>Reference</th><th>Date</th>
              </tr>
            </thead>
            <tbody>
              ${filteredRows
                .map(
                  (row) => `
                  <tr>
                    <td>${row.productName || row.productId || ""}</td>
                    <td>${row.warehouseName || row.warehouseId || ""}</td>
                    <td>${row.quantity || 0}</td>
                    <td>${row.movementType || ""}</td>
                    <td>${row.referenceId || ""}</td>
                    <td>${row.createdAt ? new Date(row.createdAt).toLocaleString() : ""}</td>
                  </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  }

  const role = typeof window !== "undefined" ? localStorage.getItem("aim_role") : "";
  const filteredRows = filterType ? rows.filter((r) => r.movementType === filterType) : rows;

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
            <div className="md:col-span-2">
              <Label>Movement Scope</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {["warehouse", "region", "zone", "area"].map((scope) => (
                  <button
                    key={scope}
                    type="button"
                    onClick={() => setField("movementScope", scope)}
                    className={`rounded-xl border px-3 py-1.5 text-xs ${form.movementScope === scope ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "hover:bg-zinc-50"}`}
                  >
                    {scope.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
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
            {["region", "zone", "area"].includes(form.movementScope) ? (
              <div>
                <Label>Region</Label>
                <select
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  value={form.regionId}
                  onChange={(e) => setField("regionId", e.target.value)}
                >
                  <option value="">Choose region...</option>
                  {regions.map((r) => (
                    <option key={r._id} value={r._id}>{r.name}</option>
                  ))}
                </select>
              </div>
            ) : null}
            {["zone", "area"].includes(form.movementScope) ? (
              <div>
                <Label>Zone</Label>
                <select
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  value={form.zoneId}
                  onChange={(e) => setField("zoneId", e.target.value)}
                >
                  <option value="">Choose zone...</option>
                  {zones.map((z) => (
                    <option key={z._id} value={z._id}>{z.name}</option>
                  ))}
                </select>
              </div>
            ) : null}
            {form.movementScope === "area" ? (
              <div>
                <Label>Area</Label>
                <select
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                  value={form.areaId}
                  onChange={(e) => setField("areaId", e.target.value)}
                >
                  <option value="">Choose area...</option>
                  {areas.map((a) => (
                    <option key={a._id} value={a._id}>{a.name}</option>
                  ))}
                </select>
              </div>
            ) : null}
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
            <div className="md:col-span-2 flex flex-wrap items-center gap-3">
              <button
                disabled={saving}
                className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Add Movement"}
              </button>
              <button
                type="button"
                onClick={exportPdf}
                className="rounded-xl border px-4 py-2 text-sm hover:bg-zinc-50"
              >
                Download PDF
              </button>
              {role === "admin" ? (
                <button
                  type="button"
                  onClick={clearMovements}
                  className="rounded-xl border px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  Clear Ledger Data
                </button>
              ) : null}
            </div>
          </form>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="text-sm text-zinc-600">Filter by movement type:</span>
          <button
            type="button"
            onClick={() => setFilterType("")}
            className={`rounded-xl border px-3 py-1.5 text-xs ${filterType === "" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "hover:bg-zinc-50"}`}
          >
            All
          </button>
          {movementTypes.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setFilterType(t)}
              className={`rounded-xl border px-3 py-1.5 text-xs ${filterType === t ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "hover:bg-zinc-50"}`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="mt-4 overflow-auto rounded-xl border">
          <table className="min-w-[900px] w-full text-sm">
            <thead className="bg-zinc-50">
              <tr>
                <th className="text-left px-3 py-2 border-b">Product</th>
                <th className="text-left px-3 py-2 border-b">Warehouse</th>
                <th className="text-left px-3 py-2 border-b">Qty</th>
                <th className="text-left px-3 py-2 border-b">Type</th>
                <th className="text-left px-3 py-2 border-b">Reference</th>
                <th className="text-left px-3 py-2 border-b">Date</th>
                <th className="text-left px-3 py-2 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-zinc-500">No movements yet</td></tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row._id} className="hover:bg-zinc-50">
                    <td className="px-3 py-2 border-b">{row.productName || row.productId}</td>
                    <td className="px-3 py-2 border-b">{row.warehouseName || row.warehouseId}</td>
                    <td className="px-3 py-2 border-b">{row.quantity}</td>
                    <td className="px-3 py-2 border-b">{row.movementType}</td>
                    <td className="px-3 py-2 border-b">{row.referenceId || "-"}</td>
                    <td className="px-3 py-2 border-b">{row.createdAt ? new Date(row.createdAt).toLocaleString() : "-"}</td>
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
        <EditCard
          form={editForm}
          onChange={setEditForm}
          onClose={() => setEditId(null)}
          onSave={onSaveEdit}
          saving={saving}
          products={products}
          warehouses={warehouses}
          regions={regions}
          zones={zones}
          areas={areas}
          movementTypes={movementTypes}
        />
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

function EditCard({ form, onChange, onClose, onSave, saving, products, warehouses, regions, zones, areas, movementTypes }) {
  if (!form) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full sm:w-[560px] bg-white shadow-xl flex flex-col">
        <div className="shrink-0 border-b px-4 py-3 flex items-center justify-between">
          <div className="text-lg font-semibold text-zinc-900">Edit Movement</div>
          <button onClick={onClose} className="rounded-xl border px-3 py-2 text-sm hover:bg-zinc-50">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 gap-3">
          <div>
            <Label>Product</Label>
            <select
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              value={form.productId}
              onChange={(e) => onChange((s) => ({ ...s, productId: e.target.value }))}
            >
              {products.map((p) => (
                <option key={p._id} value={p.productId}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Warehouse</Label>
            <select
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              value={form.warehouseId}
              onChange={(e) => onChange((s) => ({ ...s, warehouseId: e.target.value }))}
            >
              {warehouses.map((w) => (
                <option key={w._id} value={w.warehouseId}>{w.name}</option>
              ))}
            </select>
          </div>
          <Field label="Quantity (+/-)" value={form.quantity || ""} onChange={(v) => onChange((s) => ({ ...s, quantity: v }))} type="number" />
          <div>
            <Label>Movement Type</Label>
            <select
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              value={form.movementType}
              onChange={(e) => onChange((s) => ({ ...s, movementType: e.target.value }))}
            >
              {movementTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <Field label="Reference ID" value={form.referenceId || ""} onChange={(v) => onChange((s) => ({ ...s, referenceId: v }))} />
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