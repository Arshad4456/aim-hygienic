"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/api";
import { getAuthItem } from "../../lib/clientAuth";

const emptyLine = {
  productId: "",
  qty: "",
  toValue: "0",
  discValue: "0",
  extraValue: "0",
  bonsValue: "0",
  gstPer: "0",
};

export default function PrimaryOrderRequestModule({ role = "Brand Manager" }) {
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [regions, setRegions] = useState([]);
  const [zones, setZones] = useState([]);
  const [orders, setOrders] = useState([]);
  const [me, setMe] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({
    toWarehouseId: "",
    regionId: "",
    zoneId: "",
    territoryName: "",
    address: "",
    items: [{ ...emptyLine }],
  });

  const selectedRegion = useMemo(() => regions.find((item) => item._id === form.regionId), [regions, form.regionId]);
  const selectedZone = useMemo(() => zones.find((item) => item._id === form.zoneId), [zones, form.zoneId]);

  async function loadAll() {
    const localUser = typeof window !== "undefined" ? JSON.parse(getAuthItem("aim_user") || "{}") : {};
    const [wRes, pRes, rRes, zRes, meRes, oRes] = await Promise.all([
      apiFetch("/warehouses"),
      apiFetch("/products"),
      apiFetch("/regions"),
      apiFetch("/zones"),
      apiFetch("/users/me"),
      apiFetch("/orders/my"),
    ]);
    const user = meRes?.user || localUser;
    setMe(user);
    setWarehouses(wRes.warehouses || []);
    setProducts(pRes.products || []);
    setRegions(rRes.regions || []);
    setZones(zRes.zones || []);
    setOrders((oRes.orders || []).filter((order) => order.saleType === "primary"));
    setForm((prev) => ({
      ...prev,
      regionId: prev.regionId || user?.regionId || "",
      zoneId: prev.zoneId || user?.zoneId || "",
      territoryName: prev.territoryName || user?.territoryName || user?.areaName || "",
      address: prev.address || user?.address || user?.shopAddress || "",
    }));
  }

  useEffect(() => {
    loadAll().catch((e) => showToast("error", e.message || "Failed to load order request module"));
  }, []);

  function setField(key, value) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  function setItem(index, key, value) {
    setForm((s) => ({ ...s, items: s.items.map((item, idx) => (idx === index ? { ...item, [key]: value } : item)) }));
  }

  function addItem() {
    setForm((s) => ({ ...s, items: [...s.items, { ...emptyLine }] }));
  }

  async function submitRequest(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const targetWarehouse = warehouses.find((w) => w._id === form.toWarehouseId);
      const items = form.items
        .map((line) => ({ line, product: products.find((p) => p._id === line.productId) }))
        .filter((row) => row.product && Number(row.line.qty) > 0)
        .map(({ line, product }) => ({
          productName: product.name,
          productCode: product.productId,
          quantity: Number(line.qty),
          unitPrice: Number(product.wholesalePrice || 0),
          toValue: Number(line.toValue || 0),
          discValue: Number(line.discValue || 0),
          extraValue: Number(line.extraValue || 0),
          bonsValue: Number(line.bonsValue || 0),
          gstPer: Number(line.gstPer || 0),
        }));

      if (!targetWarehouse || !items.length) throw new Error("Select warehouse and at least one product row");

      await apiFetch("/orders", {
        method: "POST",
        body: {
          saleType: "primary",
          sourceType: role === "Distributor" ? "distributor" : "brand",
          customerType: role === "Distributor" ? "distributor" : "brand",
          customerName: me?.businessName || me?.fullName || role,
          toWarehouseId: targetWarehouse.warehouseId || targetWarehouse._id,
          toWarehouseName: targetWarehouse.name,
          regionId: selectedRegion?.regionId || me?.regionId || "",
          regionName: selectedRegion?.name || me?.regionName || "",
          zoneId: selectedZone?.zoneId || me?.zoneId || "",
          zoneName: selectedZone?.name || me?.zoneName || "",
          territoryName: form.territoryName,
          address: form.address,
          fromEntityName: me?.businessName || me?.fullName || "",
          fromEntityRole: role,
          items,
        },
      });

      showToast("success", "Order request submitted successfully.");
      setForm((s) => ({ ...s, toWarehouseId: "", items: [{ ...emptyLine }] }));
      await loadAll();
    } catch (e) {
      showToast("error", e.message || "Failed to submit order request");
    } finally {
      setSaving(false);
    }
  }

  async function setAgreement(orderId, agreement) {
    try {
      await apiFetch(`/orders/${orderId}/receipt-agreement`, { method: "PATCH", body: { agreement } });
      showToast("success", "Receipt response saved.");
      await loadAll();
    } catch (e) {
      showToast("error", e.message || "Failed to save receipt agreement");
    }
  }

  function showToast(type, message) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 2500);
  }

  return (
    <div className="space-y-6">
      {toast ? <InlineToast type={toast.type} message={toast.message} /> : null}

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold">Primary Sale Order Request</h3>
        <form className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={submitRequest}>
          <Input label="From" value={me?.businessName || me?.fullName || "-"} readOnly />
          <Select
            label="To Warehouse"
            value={form.toWarehouseId}
            onChange={(v) => setField("toWarehouseId", v)}
            options={warehouses.map((w) => ({ value: w._id, label: w.name }))}
          />
          <Input label="Region" value={selectedRegion?.name || me?.regionName || ""} readOnly />
          <Input label="Zone" value={selectedZone?.name || me?.zoneName || ""} readOnly />
          <Input label="Territory" value={form.territoryName} onChange={(v) => setField("territoryName", v)} readOnly />
          <Input label="Address" value={form.address} onChange={(v) => setField("address", v)} readOnly />

          <div className="md:col-span-2">
            <div className="font-semibold mb-2">Product Detail</div>
            <div className="overflow-x-auto rounded border">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b bg-zinc-50">
                    <th className="p-2 text-left">Product</th>
                    <th className="p-2 text-left">Qty</th>
                    <th className="p-2 text-left">TO</th>
                    <th className="p-2 text-left">Disc</th>
                    <th className="p-2 text-left">Extra</th>
                    <th className="p-2 text-left">Bons</th>
                    <th className="p-2 text-left">GST%</th>
                  </tr>
                </thead>
                <tbody>
                  {form.items.map((line, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="p-2"><SelectBare value={line.productId} onChange={(v) => setItem(idx, "productId", v)} options={products.map((p) => ({ value: p._id, label: `${p.productId} - ${p.name}` }))} /></td>
                      <td className="p-2"><InputBare type="number" value={line.qty} onChange={(v) => setItem(idx, "qty", v)} /></td>
                      <td className="p-2"><InputBare type="number" value={line.toValue} onChange={(v) => setItem(idx, "toValue", v)} /></td>
                      <td className="p-2"><InputBare type="number" value={line.discValue} onChange={(v) => setItem(idx, "discValue", v)} /></td>
                      <td className="p-2"><InputBare type="number" value={line.extraValue} onChange={(v) => setItem(idx, "extraValue", v)} /></td>
                      <td className="p-2"><InputBare type="number" value={line.bonsValue} onChange={(v) => setItem(idx, "bonsValue", v)} /></td>
                      <td className="p-2"><InputBare type="number" value={line.gstPer} onChange={(v) => setItem(idx, "gstPer", v)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" onClick={addItem} className="mt-2 rounded border px-3 py-1 text-sm">+ Add Product</button>
          </div>

          <div className="md:col-span-2"><button className="rounded-xl bg-emerald-600 text-white px-4 py-2" disabled={saving}>{saving ? "Submitting..." : "Submit Request"}</button></div>
        </form>
      </section>

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold">Primary Sale Ledger</h3>
        <div className="overflow-x-auto mt-3">
          <table className="min-w-full text-sm">
            <thead><tr className="border-b"><th className="p-2 text-left">Code</th><th className="p-2 text-left">Warehouse</th><th className="p-2 text-left">Status</th><th className="p-2 text-left">Invoice</th><th className="p-2 text-left">Receipt</th></tr></thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order._id} className={`border-b ${order.status === "rejected" ? "bg-red-50" : order.receiptAgreement === "agreed" ? "bg-emerald-50" : ""}`}>
                  <td className="p-2">{order.orderNo}</td>
                  <td className="p-2">{order.toWarehouseName || "-"}</td>
                  <td className="p-2 capitalize">{order.status}</td>
                  <td className="p-2">{order.invoiceNo || "Pending"}</td>
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      <span className="capitalize">{(order.receiptAgreement || "pending").replace("_", " ")}</span>
                      {order.status === "approved" && order.invoiceNo ? (
                        <>
                          <button className="rounded bg-emerald-600 px-2 py-1 text-xs text-white" onClick={() => setAgreement(order._id, "agreed")}>Agree</button>
                          <button className="rounded bg-red-600 px-2 py-1 text-xs text-white" onClick={() => setAgreement(order._id, "not_agreed")}>Not Agree</button>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {!orders.length ? <tr><td colSpan={5} className="p-4 text-center text-zinc-500">No primary orders yet.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Input({ label, value, onChange = () => {}, readOnly = false }) {
  return <label className="text-sm"><div className="text-zinc-600">{label}</div><input className="mt-1 w-full rounded-lg border px-3 py-2" value={value || ""} readOnly={readOnly} onChange={(e) => onChange(e.target.value)} /></label>;
}

function Select({ label, value, onChange, options }) {
  return <label className="text-sm"><div className="text-zinc-600">{label}</div><select className="mt-1 w-full rounded-lg border px-3 py-2" value={value} onChange={(e) => onChange(e.target.value)}><option value="">Select...</option>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>;
}

function SelectBare({ value, onChange, options }) {
  return <select className="w-full border rounded px-2 py-1 min-w-[220px]" value={value} onChange={(e) => onChange(e.target.value)}><option value="">Select</option>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>;
}

function InputBare({ type = "text", value, onChange }) {
  return <input className="w-full border rounded px-2 py-1 min-w-[90px]" type={type} value={value} onChange={(e) => onChange(e.target.value)} />;
}

function InlineToast({ type, message }) {
  const classes = type === "success" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-red-300 bg-red-50 text-red-700";
  return <div className={`fixed right-4 top-4 z-50 rounded-xl border px-4 py-3 text-sm shadow ${classes}`}>{message}</div>;
}
