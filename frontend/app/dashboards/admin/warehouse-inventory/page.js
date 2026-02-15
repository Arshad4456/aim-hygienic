"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "../components/AdminShell";
import { apiFetch } from "../../../lib/api";

const transactionTypes = [
  { value: "PURCHASING_STOCK", label: "Purchasing Stock" },
  { value: "SALE_STOCK", label: "Sale Stock" },
  { value: "DAMAGE_STOCK", label: "Damage Stock" },
  { value: "RETURN_STOCK", label: "Return Stock" },
  { value: "RETURN_TO_SD", label: "Return to SD" },
  { value: "STOCK_IN", label: "Stock In" },
  { value: "STOCK_OUT", label: "Stock Out" },
  { value: "PURCHASING_OUT", label: "Purchasing Out" },
  { value: "MOVEMENT", label: "Movement" },
];

const blankItem = {
  productId: "",
  cartonSize: "",
  cartons: "",
  packs: "",
  unitPrice: "",
  expiryDate: "",
};

export default function WarehouseInventoryModulePage() {
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [analytics, setAnalytics] = useState({ daily: [], weekly: [], monthly: [], expiryAlerts: [], returnPayments: [] });
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    transactionType: "PURCHASING_STOCK",
    warehouseId: "",
    fromEntityName: "",
    toEntityName: "",
    regionName: "",
    zoneName: "",
    territory: "",
    brandName: "",
    distributorName: "",
    subDistributorName: "",
    adjustment: "0",
    note: "",
    items: [{ ...blankItem }],
  });

  async function loadAll() {
    setErr("");
    try {
      const [productsRes, warehousesRes, txRes, analyticsRes] = await Promise.all([
        apiFetch("/products"),
        apiFetch("/warehouses"),
        apiFetch("/inventory/transactions"),
        apiFetch("/inventory/analytics"),
      ]);
      setProducts(productsRes.products || []);
      setWarehouses(warehousesRes.warehouses || []);
      setTransactions(txRes.transactions || []);
      setAnalytics(analyticsRes.analytics || { daily: [], weekly: [], monthly: [], expiryAlerts: [], returnPayments: [] });
    } catch (error) {
      setErr(error.message || "Failed to load module");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setItem(index, key, value) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, [key]: value } : item)),
    }));
  }

  function addItem() {
    setForm((prev) => ({ ...prev, items: [...prev.items, { ...blankItem }] }));
  }

  function removeItem(index) {
    setForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  }

  const normalizedItems = useMemo(
    () =>
      form.items
        .map((item) => {
          const product = products.find((entry) => entry._id === item.productId);
          const cartonSize = Number(item.cartonSize || product?.packSize || 1);
          const cartons = Number(item.cartons || 0);
          const packs = Number(item.packs || 0);
          const totalPacks = cartons * cartonSize + packs;
          return {
            productId: product?.productId || "",
            productName: product?.name || "",
            cartonSize,
            cartons,
            packs,
            totalPacks,
            unitPrice: Number(item.unitPrice || 0),
            expiryDate: item.expiryDate || undefined,
          };
        })
        .filter((item) => item.productId),
    [form.items, products]
  );

  const grandTotalPreview = useMemo(
    () => normalizedItems.reduce((sum, item) => sum + item.totalPacks * item.unitPrice, 0) + Number(form.adjustment || 0),
    [normalizedItems, form.adjustment]
  );

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setOk("");
    setSaving(true);
    try {
      const warehouse = warehouses.find((w) => w._id === form.warehouseId);
      const payload = {
        transactionType: form.transactionType,
        warehouseId: warehouse?.warehouseId || "",
        warehouseName: warehouse?.name || "",
        fromEntityName: form.fromEntityName,
        toEntityName: form.toEntityName,
        regionName: form.regionName,
        zoneName: form.zoneName,
        territory: form.territory,
        brandName: form.brandName,
        distributorName: form.distributorName,
        subDistributorName: form.subDistributorName,
        adjustment: Number(form.adjustment || 0),
        note: form.note,
        items: normalizedItems,
      };
      if (!payload.items.length) throw new Error("Select at least one product line");
      await apiFetch("/inventory/transactions", { method: "POST", body: payload });
      setOk("✅ Transaction saved and stock automatically updated.");
      setForm((prev) => ({ ...prev, items: [{ ...blankItem }], note: "", adjustment: "0" }));
      await loadAll();
    } catch (error) {
      setErr(error.message || "Failed to save transaction");
    } finally {
      setSaving(false);
    }
  }

  function printInvoice(transaction) {
    const html = `
      <html><head><title>${transaction.transactionCode}</title>
      <style>body{font-family:Arial;padding:24px;}h1{margin:0;}table{border-collapse:collapse;width:100%;margin-top:12px;}th,td{border:1px solid #ddd;padding:8px;font-size:12px;}th{background:#f3f4f6;}</style>
      </head><body>
      <h1>AIM-HYGIENICS (PVT) LIMITED</h1>
      <div>Invoice/Receipt #: ${transaction.transactionCode}</div>
      <div>Date: ${new Date(transaction.transactionAt).toLocaleString()}</div>
      <div>Type: ${transaction.transactionType}</div>
      <div>From: ${transaction.fromEntityName || "-"} | To: ${transaction.toEntityName || "-"}</div>
      <table><thead><tr><th>Product</th><th>Carton Size</th><th>Cartons</th><th>Packs</th><th>Total Packs</th><th>Unit Price</th><th>Total</th></tr></thead>
      <tbody>${(transaction.items || [])
        .map(
          (item) => `<tr><td>${item.productName}</td><td>${item.cartonSize}</td><td>${item.cartons}</td><td>${item.packs}</td><td>${item.totalPacks}</td><td>${item.unitPrice || 0}</td><td>${(item.totalPacks || 0) * (item.unitPrice || 0)}</td></tr>`
        )
        .join("")}</tbody></table>
      <h3>Grand Total: ${transaction.grandTotal || 0}</h3>
      </body></html>`;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  }

  async function markPaid(id) {
    try {
      await apiFetch(`/inventory/transactions/${id}/return-payment`, { method: "PUT", body: { status: "PAID" } });
      await loadAll();
    } catch (error) {
      setErr(error.message || "Failed to update return payment");
    }
  }

  return (
    <AdminShell title="Warehouse & Inventory" user={null}>
      <div className="space-y-6">
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-zinc-900">Warehouse & Inventory Control Tower</h2>
          <p className="text-sm text-zinc-600 mt-1">Complete stock lifecycle for purchasing, sale, damage, return, return to SD, and territory movement with date/time traceability and printable invoices.</p>
          {err ? <div className="mt-3 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{err}</div> : null}
          {ok ? <div className="mt-3 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700">{ok}</div> : null}
        </section>

        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold">e.1/e.2/e.3/e.4/e.5 Unified Transaction Entry</h3>
          <form className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={submit}>
            <Select label="Transaction Type" value={form.transactionType} onChange={(v) => setField("transactionType", v)} options={transactionTypes} />
            <Select
              label="Warehouse"
              value={form.warehouseId}
              onChange={(v) => setField("warehouseId", v)}
              options={warehouses.map((w) => ({ value: w._id, label: `${w.name} (${w.warehouseId})` }))}
            />
            <Input label="From" value={form.fromEntityName} onChange={(v) => setField("fromEntityName", v)} />
            <Input label="To" value={form.toEntityName} onChange={(v) => setField("toEntityName", v)} />
            <Input label="Region" value={form.regionName} onChange={(v) => setField("regionName", v)} />
            <Input label="Zone" value={form.zoneName} onChange={(v) => setField("zoneName", v)} />
            <Input label="Territory" value={form.territory} onChange={(v) => setField("territory", v)} />
            <Input label="Brand" value={form.brandName} onChange={(v) => setField("brandName", v)} />
            <Input label="Distributor" value={form.distributorName} onChange={(v) => setField("distributorName", v)} />
            <Input label="Sub-Distributor" value={form.subDistributorName} onChange={(v) => setField("subDistributorName", v)} />
            <Input label="Adjustment" type="number" value={form.adjustment} onChange={(v) => setField("adjustment", v)} />
            <Input label="Note" value={form.note} onChange={(v) => setField("note", v)} />

            <div className="md:col-span-2 space-y-3">
              <div className="text-sm font-semibold">Products (Cartons + Packs)</div>
              {form.items.map((item, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-7 gap-2 rounded-xl border p-3 bg-zinc-50">
                  <Select
                    label="Product"
                    value={item.productId}
                    onChange={(v) => setItem(index, "productId", v)}
                    options={products.map((p) => ({ value: p._id, label: `${p.name} (${p.size || p.packSize || "-"})` }))}
                  />
                  <Input label="Carton Size" type="number" value={item.cartonSize} onChange={(v) => setItem(index, "cartonSize", v)} />
                  <Input label="Cartons" type="number" value={item.cartons} onChange={(v) => setItem(index, "cartons", v)} />
                  <Input label="Packs" type="number" value={item.packs} onChange={(v) => setItem(index, "packs", v)} />
                  <Input label="Unit Price" type="number" value={item.unitPrice} onChange={(v) => setItem(index, "unitPrice", v)} />
                  <Input label="Expiry Date" type="date" value={item.expiryDate} onChange={(v) => setItem(index, "expiryDate", v)} />
                  <button type="button" className="mt-6 rounded-lg border px-3 py-2 text-sm hover:bg-white" onClick={() => removeItem(index)} disabled={form.items.length === 1}>Remove</button>
                </div>
              ))}
              <button type="button" className="rounded-lg border px-3 py-2 text-sm hover:bg-zinc-50" onClick={addItem}>+ Add product line</button>
            </div>

            <div className="md:col-span-2 rounded-lg border bg-emerald-50 border-emerald-200 p-3 text-sm text-emerald-800">
              Grand Total Preview: <span className="font-semibold">{grandTotalPreview.toFixed(2)}</span>
            </div>
            <div className="md:col-span-2">
              <button disabled={saving || loading} className="rounded-lg bg-zinc-900 text-white px-4 py-2 text-sm hover:bg-zinc-700">{saving ? "Saving..." : "Save Transaction"}</button>
            </div>
          </form>
        </section>

        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold">Detailed & Advanced Analytics</h3>
          {loading ? <div className="text-sm text-zinc-500 mt-3">Loading analytics...</div> : (
            <div className="grid md:grid-cols-3 gap-4 mt-4">
              <Stat title="Daily" rows={analytics.daily} />
              <Stat title="Weekly" rows={analytics.weekly} />
              <Stat title="Monthly" rows={analytics.monthly} />
            </div>
          )}
          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <div className="rounded-xl border p-4">
              <div className="font-semibold text-sm">Expiry Alerts (Next 90 Days)</div>
              <div className="mt-2 max-h-56 overflow-auto text-xs space-y-2">
                {(analytics.expiryAlerts || []).map((row) => (
                  <div key={`${row.transactionCode}-${row.productId}-${row.expiryDate}`} className="rounded-md bg-amber-50 border border-amber-200 p-2">
                    {row.productName} expires on {new Date(row.expiryDate).toLocaleDateString()} ({row.totalPacks} packs)
                  </div>
                ))}
                {!analytics.expiryAlerts?.length ? <div className="text-zinc-500">No near-expiry stock.</div> : null}
              </div>
            </div>
            <div className="rounded-xl border p-4">
              <div className="font-semibold text-sm">Return Payment Tracker (45 Days)</div>
              <div className="mt-2 max-h-56 overflow-auto text-xs space-y-2">
                {(analytics.returnPayments || []).map((row) => (
                  <div key={row._id} className="rounded-md bg-zinc-50 border p-2">
                    <div>{row.transactionCode} - {row.distributorName || row.toEntityName || "Distributor"}</div>
                    <div>Due: {row.paymentDueDate ? new Date(row.paymentDueDate).toLocaleDateString() : "-"} | Status: {row.returnPaymentStatus}</div>
                    {row.returnPaymentStatus !== "PAID" ? <button onClick={() => markPaid(row._id)} className="mt-1 rounded border px-2 py-1">Mark Paid</button> : null}
                  </div>
                ))}
                {!analytics.returnPayments?.length ? <div className="text-zinc-500">No pending return payments.</div> : null}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold">Transaction Ledger + Invoice/Receipt Download</h3>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="p-2">Code</th><th className="p-2">Type</th><th className="p-2">Date & Time</th><th className="p-2">Warehouse</th><th className="p-2">Grand Total</th><th className="p-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((txn) => (
                  <tr key={txn._id} className="border-b">
                    <td className="p-2">{txn.transactionCode}</td>
                    <td className="p-2">{txn.transactionType}</td>
                    <td className="p-2">{new Date(txn.transactionAt).toLocaleString()}</td>
                    <td className="p-2">{txn.warehouseName || "-"}</td>
                    <td className="p-2">{Number(txn.grandTotal || 0).toFixed(2)}</td>
                    <td className="p-2"><button onClick={() => printInvoice(txn)} className="rounded border px-2 py-1 hover:bg-zinc-50">Invoice/Receipt</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!transactions.length ? <div className="text-sm text-zinc-500 mt-3">No transactions yet.</div> : null}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}

function Input({ label, value, onChange, type = "text" }) {
  return (
    <label className="text-sm">
      <span className="text-zinc-600">{label}</span>
      <input className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" value={value} type={type} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="text-sm">
      <span className="text-zinc-600">{label}</span>
      <select className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select...</option>
        {options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </label>
  );
}

function Stat({ title, rows }) {
  return (
    <div className="rounded-xl border p-4">
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-2 space-y-1 text-xs">
        {(rows || []).map((row) => (
          <div key={row._id} className="flex justify-between">
            <span>{row._id}</span>
            <span>{row.transactions} tx / {Number(row.amount || 0).toFixed(0)} amount / {row.packs} packs</span>
          </div>
        ))}
        {!rows?.length ? <div className="text-zinc-500">No data</div> : null}
      </div>
    </div>
  );
}