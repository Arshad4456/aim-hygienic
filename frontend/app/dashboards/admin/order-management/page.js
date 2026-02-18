"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "../components/AdminShell";
import { apiFetch } from "../../../lib/api";

const emptyItem = {
  productId: "",
  qty: "",
  toValue: "0",
  discValue: "0",
  extraValue: "0",
  bonsValue: "0",
  gstPer: "0",
};

const modeConfig = {
  primary: {
    title: "Primary Orders",
    saleType: "primary",
  },
  secondary: {
    title: "Secondary Orders",
    saleType: "secondary",
    sourceOptions: [
      { value: "order_booker", label: "Order Booker" },
      { value: "customer", label: "Customer" },
    ],
  },
};

const primarySaleModes = [
  { key: "brand", label: "Brand" },
  { key: "distributor", label: "Distributor" },
  { key: "subDistributor", label: "Sub-Distributor" },
];

export default function OrderManagementModulePage() {
  const [activeMode, setActiveMode] = useState("");
  const [orders, setOrders] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [regions, setRegions] = useState([]);
  const [zones, setZones] = useState([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({
    sourceType: "brand",
    primarySaleMode: "brand",
    businessType: "",
    businessName: "",
    distributorName: "",
    subDistributorName: "",
    customerName: "",
    toWarehouseId: "",
    regionId: "",
    zoneId: "",
    territoryName: "",
    address: "",
    items: [{ ...emptyItem }],
  });

  const selectedRegion = useMemo(() => regions.find((item) => item._id === form.regionId), [regions, form.regionId]);
  const selectedZone = useMemo(() => zones.find((item) => item._id === form.zoneId), [zones, form.zoneId]);

  async function loadData() {
    const [oRes, wRes, pRes, rRes, zRes] = await Promise.all([
      apiFetch("/orders"),
      apiFetch("/warehouses"),
      apiFetch("/products"),
      apiFetch("/regions"),
      apiFetch("/zones"),
    ]);
    setOrders(oRes.orders || []);
    setWarehouses(wRes.warehouses || []);
    setProducts(pRes.products || []);
    setRegions(rRes.regions || []);
    setZones(zRes.zones || []);
  }

  useEffect(() => {
    loadData().catch((e) => showToast("error", e.message || "Failed to load order module"));
  }, []);

  useEffect(() => {
    if (!activeMode) return;
    const defaults = modeConfig[activeMode];
    setForm((prev) => ({
      ...prev,
      sourceType: defaults.sourceOptions?.[0]?.value || "brand",
      primarySaleMode: "brand",
    }));
  }, [activeMode]);

  const filteredOrders = useMemo(() => {
    if (!activeMode) return [];
    return orders.filter((order) => order.saleType === modeConfig[activeMode].saleType);
  }, [activeMode, orders]);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setItem(index, key, value) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, idx) => (idx === index ? { ...item, [key]: value } : item)),
    }));
  }

  async function submitOrder(event) {
    event.preventDefault();
    if (!activeMode) return;
    setSaving(true);
    try {
      const targetWarehouse = warehouses.find((item) => item._id === form.toWarehouseId);
      const primaryCustomerName =
        form.primarySaleMode === "brand"
          ? form.businessName
          : form.primarySaleMode === "distributor"
            ? form.distributorName
            : form.subDistributorName;
      const customerName = activeMode === "primary" ? primaryCustomerName : form.customerName;
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

      if (!targetWarehouse || !items.length || !customerName.trim()) {
        throw new Error("Customer/source name, warehouse, and one product row are required");
      }

      const sourceType =
        activeMode === "primary"
          ? form.primarySaleMode === "subDistributor"
            ? "distributor"
            : form.primarySaleMode
          : form.sourceType;

      const primaryMeta =
        activeMode === "primary"
          ? [form.businessType, form.businessName, form.distributorName, form.subDistributorName].filter(Boolean).join(" | ")
          : "";

      await apiFetch("/orders", {
        method: "POST",
        body: {
          saleType: modeConfig[activeMode].saleType,
          sourceType,
          customerType: sourceType === "brand" ? "brand" : sourceType,
          customerName,
          fromEntityName: customerName,
          fromEntityRole: modeConfig[activeMode].title,
          toWarehouseId: targetWarehouse.warehouseId || targetWarehouse._id,
          toWarehouseName: targetWarehouse.name,
          regionId: selectedRegion?.regionId || "",
          regionName: selectedRegion?.name || "",
          zoneId: selectedZone?.zoneId || "",
          zoneName: selectedZone?.name || "",
          territoryName: form.territoryName,
          address: form.address,
          items,
          notes: primaryMeta ? `Sale stock detail: ${primaryMeta}` : undefined,
        },
      });

      showToast("success", `${modeConfig[activeMode].title} request created successfully.`);
      setForm((prev) => ({
        ...prev,
        customerName: "",
        businessType: "",
        businessName: "",
        distributorName: "",
        subDistributorName: "",
        toWarehouseId: "",
        items: [{ ...emptyItem }],
      }));
      await loadData();
    } catch (e) {
      showToast("error", e.message || "Failed to submit order request");
    } finally {
      setSaving(false);
    }
  }

  function showToast(type, message) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 2500);
  }

  return (
    <AdminShell title="Order Management" user={null}>
      <div className="space-y-6">
        {toast ? <InlineToast type={toast.type} message={toast.message} /> : null}

        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="text-xl font-semibold text-zinc-900">Order Management Module Overview</div>
          <div className="text-sm text-zinc-500 mt-1">Choose one workflow card to manage request form and ledger.</div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {Object.entries(modeConfig).map(([key, cfg]) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveMode(key)}
                className={`rounded-2xl border p-5 text-left ${activeMode === key ? "border-emerald-300 bg-emerald-50" : "bg-zinc-50 hover:bg-white"}`}
              >
                <div className="text-base font-semibold text-zinc-900">{cfg.title} Card</div>
                <div className="text-xs text-zinc-600 mt-1">Open {cfg.title.toLowerCase()} flow.</div>
              </button>
            ))}
          </div>
        </section>

        {activeMode ? (
          <section className="rounded-2xl border bg-white p-6 shadow-sm space-y-5">
            <div className="text-lg font-semibold text-zinc-900">{activeMode === "primary" ? "Create Sale Order" : "Secondary Order Request"}</div>
            {activeMode === "primary" ? <div className="text-sm text-zinc-500">Sale Stock functionality with Sale Order Ledger.</div> : null}
            <form className="grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={submitOrder}>
              {activeMode === "primary" ? (
                <>
                  <div className="md:col-span-2 flex gap-2">
                    {primarySaleModes.map((mode) => (
                      <button
                        key={mode.key}
                        type="button"
                        onClick={() => setField("primarySaleMode", mode.key)}
                        className={`rounded border px-2 py-1 text-xs ${form.primarySaleMode === mode.key ? "bg-emerald-50 border-emerald-300" : ""}`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>

                  <Select label="From (Warehouse)" value={form.toWarehouseId} onChange={(v) => setField("toWarehouseId", v)} options={warehouses.map((w) => ({ value: w._id, label: w.name }))} />
                  <Input label="Address" value={form.address} onChange={(v) => setField("address", v)} />
                  <Select label="Region" value={form.regionId} onChange={(v) => setField("regionId", v)} options={regions.map((r) => ({ value: r._id, label: r.name }))} />
                  <Select label="Zone" value={form.zoneId} onChange={(v) => setField("zoneId", v)} options={zones.filter((z) => !form.regionId || z.regionId === selectedRegion?.regionId).map((z) => ({ value: z._id, label: z.name }))} />
                  <Input label="Territory" value={form.territoryName} onChange={(v) => setField("territoryName", v)} />

                  {form.primarySaleMode === "brand" ? (
                    <>
                      <Input label="Business Type" value={form.businessType} onChange={(v) => setField("businessType", v)} />
                      <Input label="Business Name" value={form.businessName} onChange={(v) => setField("businessName", v)} />
                    </>
                  ) : null}
                  {form.primarySaleMode === "distributor" ? (
                    <Input label="Distributor Name" value={form.distributorName} onChange={(v) => setField("distributorName", v)} />
                  ) : null}
                  {form.primarySaleMode === "subDistributor" ? (
                    <Input label="Sub-Distributor Name" value={form.subDistributorName} onChange={(v) => setField("subDistributorName", v)} />
                  ) : null}
                </>
              ) : (
                <>
                  <Select
                    label="Request Source"
                    value={form.sourceType}
                    onChange={(v) => setField("sourceType", v)}
                    options={modeConfig[activeMode].sourceOptions}
                  />
                  <Input label="From" value={form.customerName} onChange={(v) => setField("customerName", v)} placeholder="Enter source name" />
                  <Select label="To Warehouse" value={form.toWarehouseId} onChange={(v) => setField("toWarehouseId", v)} options={warehouses.map((w) => ({ value: w._id, label: w.name }))} />
                  <Input label="Address" value={form.address} onChange={(v) => setField("address", v)} />
                  <Select label="Region" value={form.regionId} onChange={(v) => setField("regionId", v)} options={regions.map((r) => ({ value: r._id, label: r.name }))} />
                  <Select label="Zone" value={form.zoneId} onChange={(v) => setField("zoneId", v)} options={zones.filter((z) => !form.regionId || z.regionId === selectedRegion?.regionId).map((z) => ({ value: z._id, label: z.name }))} />
                  <Input label="Territory" value={form.territoryName} onChange={(v) => setField("territoryName", v)} />
                </>
              )}

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
                <button type="button" className="mt-2 rounded border px-3 py-1 text-sm" onClick={() => setForm((prev) => ({ ...prev, items: [...prev.items, { ...emptyItem }] }))}>+ Add Product</button>
              </div>

              <div className="md:col-span-2">
                <button type="submit" className="rounded-xl bg-emerald-600 px-4 py-2 text-white disabled:opacity-60" disabled={saving}>
                  {saving ? "Submitting..." : activeMode === "primary" ? "Create Sale Order" : "Submit Request"}
                </button>
              </div>
            </form>

            <div className="pt-2">
              <div className="text-lg font-semibold text-zinc-900">{activeMode === "primary" ? "Sale Order Ledger" : `${modeConfig[activeMode].title} Ledger`}</div>
              <div className="overflow-x-auto mt-3 rounded border">
                <table className="min-w-full text-sm">
                  <thead className="bg-zinc-50"><tr><th className="p-2 text-left">Order Code</th><th className="p-2 text-left">From</th><th className="p-2 text-left">Warehouse</th><th className="p-2 text-left">Status</th><th className="p-2 text-left">Invoice</th><th className="p-2 text-left">Date</th></tr></thead>
                  <tbody>
                    {filteredOrders.map((order) => (
                      <tr key={order._id} className={`border-t ${order.status === "rejected" ? "bg-red-50" : order.status === "delivered" ? "bg-emerald-50" : ""}`}>
                        <td className="p-2">{order.orderNo}</td>
                        <td className="p-2">{order.customerName}</td>
                        <td className="p-2">{order.toWarehouseName || "-"}</td>
                        <td className="p-2 capitalize">{order.status}</td>
                        <td className="p-2">{order.invoiceNo || "Pending"}</td>
                        <td className="p-2">{order.createdAt ? new Date(order.createdAt).toLocaleString() : "-"}</td>
                      </tr>
                    ))}
                    {!filteredOrders.length ? <tr><td colSpan={6} className="p-5 text-center text-zinc-500">No records in this ledger.</td></tr> : null}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </AdminShell>
  );
}

function Input({ label, value, onChange, placeholder = "" }) {
  return <label className="text-sm"><div className="text-zinc-600">{label}</div><input className="mt-1 w-full rounded-lg border px-3 py-2" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} /></label>;
}

function Select({ label, value, onChange, options }) {
  return <label className="text-sm"><div className="text-zinc-600">{label}</div><select className="mt-1 w-full rounded-lg border px-3 py-2" value={value} onChange={(e) => onChange(e.target.value)}><option value="">Select...</option>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>;
}

function SelectBare({ value, onChange, options }) {
  return <select className="w-full min-w-[220px] rounded border px-2 py-1" value={value} onChange={(e) => onChange(e.target.value)}><option value="">Select</option>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>;
}

function InputBare({ type = "text", value, onChange }) {
  return <input className="w-full min-w-[88px] rounded border px-2 py-1" type={type} value={value} onChange={(e) => onChange(e.target.value)} />;
}

function InlineToast({ type, message }) {
  const classes = type === "success" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-red-300 bg-red-50 text-red-700";
  return <div className={`fixed right-4 top-4 z-50 rounded-xl border px-4 py-3 text-sm shadow ${classes}`}>{message}</div>;
}
