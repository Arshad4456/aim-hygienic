"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "../components/AdminShell";
import { apiFetch } from "../../../lib/api";

const cards = [
  { key: "PURCHASING_STOCK", title: "e.1 Purchasing Stock", detail: "Record supplier/industry purchases with carton-size notation, pack/carton pricing, totals, source, date and time." },
  { key: "SALE_STOCK", title: "e.2 Sale Stock", detail: "Record brand/distributor sales with destination mapping and printable invoice." },
  { key: "DAMAGE_STOCK", title: "e.3 Damage Stock", detail: "Capture damaged/expired stock and monitor expiry warnings before 2–3 months." },
  { key: "RETURN_STOCK", title: "e.4 Return Stock", detail: "Capture returns from brands/distributors and track payable return settlement due within 45 days." },
  { key: "RETURN_TO_SD", title: "e.5 Return to SD (Sub-Distributor)", detail: "Resell returned stock to a sub-distributor in same/other territory with full movement trail." },
];

const blankItem = { productId: "", cartonSize: "", onePackPrice: "", oneCartonPrice: "", totalPrice: "", expiryDate: "" };

function parseCartonSize(value) {
  const match = String(value || "").trim().toLowerCase().replace(/\s+/g, "").match(/^(\d+)x(\d+)$/);
  if (!match) return { cartonCount: 0, totalPacks: 0, packsPerCarton: 0 };
  const cartonCount = Number(match[1] || 0);
  const totalPacks = Number(match[2] || 0);
  return {
    cartonCount,
    totalPacks,
    packsPerCarton: cartonCount > 0 ? totalPacks / cartonCount : 0,
  };
}

export default function WarehouseInventoryModulePage() {
  const [selectedCard, setSelectedCard] = useState(cards[0].key);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [analytics, setAnalytics] = useState({ daily: [], weekly: [], monthly: [], expiryAlerts: [], returnPayments: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [form, setForm] = useState({ warehouseId: "", fromEntityName: "", toEntityName: "", territory: "", distributorName: "", subDistributorName: "", note: "", adjustment: "0", items: [{ ...blankItem }] });

  async function loadAll() {
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
    } catch (e) {
      setErr(e.message || "Failed to load module");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  function setField(key, value) { setForm((p) => ({ ...p, [key]: value })); }
  function setItem(i, key, value) { setForm((p) => ({ ...p, items: p.items.map((it, idx) => (idx === i ? { ...it, [key]: value } : it)) })); }
  function addItem() { setForm((p) => ({ ...p, items: [...p.items, { ...blankItem }] })); }
  function removeItem(i) { setForm((p) => ({ ...p, items: p.items.filter((_, idx) => idx !== i) })); }

  const normalizedItems = useMemo(() => form.items.map((item) => {
    const product = products.find((p) => p._id === item.productId);
    const parsed = parseCartonSize(item.cartonSize);
    return {
      productId: product?.productId || "",
      productName: product?.name || "",
      cartonSize: item.cartonSize,
      cartons: parsed.cartonCount,
      totalPacks: parsed.totalPacks,
      packsPerCarton: parsed.packsPerCarton,
      onePackPrice: Number(item.onePackPrice || 0),
      oneCartonPrice: Number(item.oneCartonPrice || 0),
      totalPrice: Number(item.totalPrice || 0),
      unitPrice: parsed.totalPacks > 0 ? Number(item.totalPrice || 0) / parsed.totalPacks : 0,
      expiryDate: item.expiryDate || undefined,
    };
  }).filter((i) => i.productId), [form.items, products]);

  const totalPreview = useMemo(() => normalizedItems.reduce((s, i) => s + Number(i.totalPrice || 0), 0) + Number(form.adjustment || 0), [normalizedItems, form.adjustment]);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setOk("");
    setSaving(true);
    try {
      const warehouse = warehouses.find((w) => w._id === form.warehouseId);
      await apiFetch("/inventory/transactions", {
        method: "POST",
        body: {
          transactionType: selectedCard,
          warehouseId: warehouse?.warehouseId || "",
          warehouseName: warehouse?.name || "",
          fromEntityName: form.fromEntityName,
          toEntityName: form.toEntityName,
          territory: form.territory,
          distributorName: form.distributorName,
          subDistributorName: form.subDistributorName,
          note: form.note,
          adjustment: Number(form.adjustment || 0),
          items: normalizedItems,
        },
      });
      setOk("✅ Saved. Stock and analytics updated.");
      setForm((p) => ({ ...p, note: "", adjustment: "0", items: [{ ...blankItem }] }));
      await loadAll();
    } catch (e2) {
      setErr(e2.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function printInvoice(txn) {
    const html = `<html><body style="font-family:Arial;padding:20px;"><h1>AIM-HYGIENICS (PVT) LIMITED</h1><h3>${txn.transactionCode}</h3><div>${txn.transactionType} | ${new Date(txn.transactionAt).toLocaleString()}</div><table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;margin-top:10px;width:100%"><tr><th>Product</th><th>Carton Size</th><th>1 Pack Price</th><th>1 Carton Price</th><th>Total Price</th></tr>${(txn.items || []).map((i)=>`<tr><td>${i.productName}</td><td>${i.cartonSize || "-"}</td><td>${i.onePackPrice || 0}</td><td>${i.oneCartonPrice || 0}</td><td>${i.totalPrice || 0}</td></tr>`).join("")}</table><h3>Grand Total: ${txn.grandTotal || 0}</h3></body></html>`;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.print();
  }

  const currentCard = cards.find((c) => c.key === selectedCard);
  const cardTx = transactions.filter((t) => t.transactionType === selectedCard);

  return (
    <AdminShell title="Warehouse & Inventory" user={null}>
      <div className="space-y-6">
        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold">Warehouse & Inventory Module</h2>
          <p className="text-sm text-zinc-600 mt-1">Select a module card (e.1 to e.5). On click, complete details for that specific workflow.</p>
          {err ? <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div> : null}
          {ok ? <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{ok}</div> : null}
          <div className="grid md:grid-cols-3 gap-3 mt-4">
            {cards.map((c) => (
              <button key={c.key} type="button" onClick={() => setSelectedCard(c.key)} className={`text-left rounded-xl border p-3 ${selectedCard === c.key ? "border-emerald-300 bg-emerald-50" : "hover:bg-zinc-50"}`}>
                <div className="font-semibold text-sm">{c.title}</div>
                <div className="text-xs text-zinc-600 mt-1">Click to open details</div>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold">{currentCard?.title}</h3>
          <p className="text-sm text-zinc-600 mt-1">{currentCard?.detail}</p>
          <form className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={submit}>
            <Select label="Warehouse" value={form.warehouseId} onChange={(v) => setField("warehouseId", v)} options={warehouses.map((w) => ({ value: w._id, label: `${w.name} (${w.warehouseId})` }))} />
            <Input label="From" value={form.fromEntityName} onChange={(v) => setField("fromEntityName", v)} />
            <Input label="To" value={form.toEntityName} onChange={(v) => setField("toEntityName", v)} />
            <Input label="Territory" value={form.territory} onChange={(v) => setField("territory", v)} />
            <Input label="Distributor" value={form.distributorName} onChange={(v) => setField("distributorName", v)} />
            <Input label="Sub-Distributor" value={form.subDistributorName} onChange={(v) => setField("subDistributorName", v)} />
            <Input label="Adjustment" type="number" value={form.adjustment} onChange={(v) => setField("adjustment", v)} />
            <Input label="Note" value={form.note} onChange={(v) => setField("note", v)} />

            <div className="md:col-span-2 space-y-2 mt-2">
              <div className="text-sm font-semibold">Product Details</div>
              {form.items.map((item, i) => (
                <div key={i} className="grid md:grid-cols-7 gap-2 rounded-xl border p-3 bg-zinc-50">
                  <Select label="Product" value={item.productId} onChange={(v) => setItem(i, "productId", v)} options={products.map((p) => ({ value: p._id, label: p.name }))} />
                  <Input label="Carton Size (e.g. 1x8, 2x16)" value={item.cartonSize} onChange={(v) => setItem(i, "cartonSize", v)} />
                  <Input label="1 Pack Price" type="number" value={item.onePackPrice} onChange={(v) => setItem(i, "onePackPrice", v)} />
                  <Input label="1 Carton Price" type="number" value={item.oneCartonPrice} onChange={(v) => setItem(i, "oneCartonPrice", v)} />
                  <Input label="Total Price" type="number" value={item.totalPrice} onChange={(v) => setItem(i, "totalPrice", v)} />
                  <Input label="Expiry Date" type="date" value={item.expiryDate} onChange={(v) => setItem(i, "expiryDate", v)} />
                  <button type="button" onClick={() => removeItem(i)} disabled={form.items.length === 1} className="mt-6 rounded-lg border px-2 py-2 text-sm">Remove</button>
                </div>
              ))}
              <button type="button" className="rounded-lg border px-3 py-1.5 text-sm" onClick={addItem}>+ Add product line</button>
            </div>

            <div className="md:col-span-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm">Grand Total Preview: <span className="font-semibold">{totalPreview.toFixed(2)}</span></div>
            <div className="md:col-span-2"><button disabled={saving || loading} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white">{saving ? "Saving..." : "Save"}</button></div>
          </form>
        </section>

        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold">Daily / Weekly / Monthly Analysis</h3>
          <div className="grid md:grid-cols-3 gap-3 mt-3"><Stat title="Daily" rows={analytics.daily} /><Stat title="Weekly" rows={analytics.weekly} /><Stat title="Monthly" rows={analytics.monthly} /></div>
          <div className="grid md:grid-cols-2 gap-3 mt-3 text-xs">
            <div className="rounded-xl border p-3"><div className="font-semibold">Near Expiry Alerts</div>{analytics.expiryAlerts?.length ? analytics.expiryAlerts.map((r) => <div key={`${r.transactionCode}-${r.productId}`}>{r.productName} - {new Date(r.expiryDate).toLocaleDateString()}</div>) : <div className="text-zinc-500">No alerts</div>}</div>
            <div className="rounded-xl border p-3"><div className="font-semibold">Return Payment (45 days)</div>{analytics.returnPayments?.length ? analytics.returnPayments.map((r) => <div key={r._id}>{r.transactionCode} - {r.returnPaymentStatus}</div>) : <div className="text-zinc-500">No pending payments</div>}</div>
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold">{currentCard?.title} Ledger</h3>
          <div className="overflow-x-auto mt-3">
            <table className="min-w-full text-sm">
              <thead><tr className="border-b"><th className="p-2 text-left">Code</th><th className="p-2 text-left">Date & Time</th><th className="p-2 text-left">Grand Total</th><th className="p-2 text-left">Action</th></tr></thead>
              <tbody>{cardTx.map((t) => <tr key={t._id} className="border-b"><td className="p-2">{t.transactionCode}</td><td className="p-2">{new Date(t.transactionAt).toLocaleString()}</td><td className="p-2">{Number(t.grandTotal || 0).toFixed(2)}</td><td className="p-2"><button onClick={() => printInvoice(t)} className="rounded border px-2 py-1">Invoice/Receipt</button></td></tr>)}</tbody>
            </table>
            {!cardTx.length ? <div className="text-sm text-zinc-500 mt-2">No records for this card.</div> : null}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}

function Input({ label, value, onChange, type = "text" }) {
  return <label className="text-sm"><span className="text-zinc-600">{label}</span><input className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" type={type} value={value} onChange={(e) => onChange(e.target.value)} /></label>;
}

function Select({ label, value, onChange, options }) {
  return <label className="text-sm"><span className="text-zinc-600">{label}</span><select className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" value={value} onChange={(e) => onChange(e.target.value)}><option value="">Select...</option>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>;
}

function Stat({ title, rows }) {
  return <div className="rounded-xl border p-3 text-xs"><div className="font-semibold text-sm">{title}</div>{rows?.length ? rows.map((r) => <div key={r._id}>{r._id}: {r.transactions} tx / {Number(r.amount || 0).toFixed(0)}</div>) : <div className="text-zinc-500">No data</div>}</div>;
}