"use client";

import { useEffect, useMemo, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { apiFetch } from "../../lib/api";

const emptyLine = {
  productId: "",
  qty: "",
  toValue: "0",
  discValue: "0",
  extraValue: "0",
  bonsValue: "0",
  gstPer: "0",
  manufactureDate: "",
  expiryDate: "",
};

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default function ReturnStockRequestModule({ role = "Brand Manager" }) {
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [regions, setRegions] = useState([]);
  const [zones, setZones] = useState([]);
  const [requests, setRequests] = useState([]);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({
    toWarehouseId: "",
    regionId: "",
    zoneId: "",
    territoryName: "",
    address: "",
    items: [{ ...emptyLine }],
  });

  async function loadData() {
    const me = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("aim_user") || "{}") : {};
    setUser(me);
    try {
      const [wRes, pRes, rRes, zRes, reqRes] = await Promise.all([
        apiFetch("/warehouses"),
        apiFetch("/products"),
        apiFetch("/regions"),
        apiFetch("/zones"),
        apiFetch(`/inventory/transactions?transactionType=RETURN_STOCK&requestSourceRole=${encodeURIComponent(role)}`),
      ]);
      setWarehouses(wRes.warehouses || []);
      setProducts(pRes.products || []);
      setRegions(rRes.regions || []);
      setZones(zRes.zones || []);
      setRequests((reqRes.transactions || []).sort((a, b) => new Date(b.transactionAt) - new Date(a.transactionAt)));
    } catch (e) {
      toast.error(e.message || "Failed to load return stock module");
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const zonesForRegion = useMemo(() => {
    const region = regions.find((r) => r._id === form.regionId);
    return region ? zones.filter((z) => z.regionId === region.regionId) : [];
  }, [regions, zones, form.regionId]);

  function setField(key, value) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  function setItem(i, key, value) {
    setForm((s) => ({ ...s, items: s.items.map((it, idx) => (idx === i ? { ...it, [key]: value } : it)) }));
  }

  function addItem() {
    setForm((s) => ({ ...s, items: [...s.items, { ...emptyLine }] }));
  }

  function removeItem(i) {
    setForm((s) => ({ ...s, items: s.items.filter((_, idx) => idx !== i) }));
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const toWarehouse = warehouses.find((w) => w._id === form.toWarehouseId);
      const region = regions.find((r) => r._id === form.regionId);
      const zone = zones.find((z) => z._id === form.zoneId);
      const rows = form.items
        .map((line) => ({ line, product: products.find((p) => p._id === line.productId) }))
        .filter((row) => row.product && toNum(row.line.qty) > 0);

      if (!toWarehouse || !rows.length) {
        toast.error("Please select warehouse and at least one valid product row.");
        return;
      }

      const items = rows.map(({ line, product }) => ({
        productId: product.productId,
        productName: product.name,
        cartonSize: `1x${toNum(line.qty)}`,
        cartons: 1,
        totalPacks: toNum(line.qty),
        packsPerCarton: toNum(line.qty),
        onePackPrice: toNum(product.wholesalePrice || 0),
        oneCartonPrice: toNum(product.wholesalePrice || 0),
        totalPrice: toNum(product.wholesalePrice || 0) * toNum(line.qty),
        unitPrice: toNum(product.wholesalePrice || 0),
        manufactureDate: line.manufactureDate || undefined,
        expiryDate: line.expiryDate || undefined,
        notes: `gross:0,to:0,disc:0,extra:0,bons:0,v4gst:0,gst:0,net:0`,
      }));

      const sourceRole = role === "Distributor" ? "DISTRIBUTOR" : "BRAND";
      const sourceName = (user?.businessName || user?.fullName || user?.username || "").trim();

      await apiFetch("/inventory/transactions", {
        method: "POST",
        body: {
          transactionType: "RETURN_STOCK",
          warehouseId: toWarehouse.warehouseId,
          warehouseName: toWarehouse.name,
          fromEntityType: sourceRole,
          fromEntityName: sourceName,
          distributorName: sourceRole === "DISTRIBUTOR" ? sourceName : "",
          brandName: sourceRole === "BRAND" ? sourceName : "",
          toEntityName: toWarehouse.name,
          regionId: region?.regionId || "",
          regionName: region?.name || "",
          zoneId: zone?.zoneId || "",
          zoneName: zone?.name || "",
          territory: form.territoryName,
          note: form.address,
          items,
          subtotal: items.reduce((sum, it) => sum + toNum(it.totalPrice), 0),
          grandTotal: items.reduce((sum, it) => sum + toNum(it.totalPrice), 0),
        },
      });

      toast.success("Return stock request submitted.");
      setForm((s) => ({ ...s, items: [{ ...emptyLine }] }));
      await loadData();
    } catch (e2) {
      toast.error(e2.message || "Failed to submit request");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-4 md:p-6">
      <ToastContainer position="top-right" autoClose={2500} />
      <div className="mx-auto max-w-6xl space-y-4">
        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <h1 className="text-xl font-semibold">Return Stock</h1>
          <p className="text-sm text-zinc-500">Module Overview</p>
        </section>

        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold">Return Stock Request</h3>
          <form onSubmit={submit} className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input label="From" value={user?.businessName || user?.fullName || ""} onChange={() => {}} readOnly />
            <Select label="To Warehouse" value={form.toWarehouseId} onChange={(v) => setField("toWarehouseId", v)} options={warehouses.map((w) => ({ value: w._id, label: w.name }))} />
            <Select label="Region" value={form.regionId} onChange={(v) => setField("regionId", v)} options={regions.map((r) => ({ value: r._id, label: r.name }))} />
            <Select label="Zone" value={form.zoneId} onChange={(v) => setField("zoneId", v)} options={zonesForRegion.map((z) => ({ value: z._id, label: z.name }))} />
            <Input label="Territory" value={form.territoryName} onChange={(v) => setField("territoryName", v)} />
            <Input label="Address" value={form.address} onChange={(v) => setField("address", v)} />

            <div className="md:col-span-2">
              <h4 className="font-semibold mb-2">Product Detail</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border">
                  <thead>
                    <tr className="border-b bg-zinc-50">
                      <th className="p-2 text-left">Product</th>
                      <th className="p-2 text-left">Qty</th>
                      <th className="p-2 text-left">MFG Date</th>
                      <th className="p-2 text-left">EXP Date</th>
                      <th className="p-2 text-left">TO</th>
                      <th className="p-2 text-left">Disc</th>
                      <th className="p-2 text-left">Extra</th>
                      <th className="p-2 text-left">Bons</th>
                      <th className="p-2 text-left">GST%</th>
                      <th className="p-2 text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.items.map((line, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="p-2"><SelectBare value={line.productId} onChange={(v) => setItem(idx, "productId", v)} options={products.map((p) => ({ value: p._id, label: `${p.productId} - ${p.name}` }))} /></td>
                        <td className="p-2"><InputBare value={line.qty} onChange={(v) => setItem(idx, "qty", v)} type="number" /></td>
                        <td className="p-2"><InputBare value={line.manufactureDate} onChange={(v) => setItem(idx, "manufactureDate", v)} type="date" /></td>
                        <td className="p-2"><InputBare value={line.expiryDate} onChange={(v) => setItem(idx, "expiryDate", v)} type="date" /></td>
                        <td className="p-2"><InputBare value={line.toValue} readOnly /></td>
                        <td className="p-2"><InputBare value={line.discValue} readOnly /></td>
                        <td className="p-2"><InputBare value={line.extraValue} readOnly /></td>
                        <td className="p-2"><InputBare value={line.bonsValue} readOnly /></td>
                        <td className="p-2"><InputBare value={line.gstPer} readOnly /></td>
                        <td className="p-2"><button type="button" className="rounded border px-2 py-1" onClick={() => removeItem(idx)}>Remove</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-2">
                <button type="button" className="rounded border px-3 py-1 text-sm" onClick={addItem}>+ Add Product</button>
              </div>
            </div>

            <div className="md:col-span-2">
              <button disabled={saving} className="rounded-xl bg-emerald-600 text-white px-4 py-2 text-sm font-medium disabled:opacity-60">
                {saving ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold">Return Stock Requests</h3>
          <div className="overflow-x-auto mt-3">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-2 text-left">Code</th>
                  <th className="p-2 text-left">Date and Time</th>
                  <th className="p-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => {
                  const status = String(r.requestStatus || "APPROVED").toUpperCase();
                  const rowClass = status === "REJECTED" ? "border-b bg-red-50" : status === "APPROVED" ? "border-b bg-blue-50" : "border-b";
                  return (
                    <tr key={r._id} className={rowClass}>
                      <td className="p-2">{r.transactionCode}</td>
                      <td className="p-2">{r.transactionAt ? new Date(r.transactionAt).toLocaleString() : "-"}</td>
                      <td className="p-2">{status}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = "text", readOnly = false }) {
  return <label className="text-sm"><span className="text-zinc-600">{label}</span><input className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" type={type} value={value} readOnly={readOnly} onChange={(e) => onChange(e.target.value)} /></label>;
}

function Select({ label, value, onChange, options }) {
  return <label className="text-sm"><span className="text-zinc-600">{label}</span><select className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" value={value} onChange={(e) => onChange(e.target.value)}><option value="">Select...</option>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>;
}

function InputBare({ value, onChange = () => {}, type = "text", readOnly = false }) {
  return <input className="w-full min-w-[82px] border rounded px-2 py-1" type={type} value={value} readOnly={readOnly} onChange={(e) => onChange(e.target.value)} />;
}

function SelectBare({ value, onChange, options }) {
  return <select className="w-full min-w-[220px] border rounded px-2 py-1" value={value} onChange={(e) => onChange(e.target.value)}><option value="">Select</option>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>;
}