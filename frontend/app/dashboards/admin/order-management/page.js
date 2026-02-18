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
    title: "Primary Order",
    saleType: "primary",
    sourceOptions: [
      { value: "brand", label: "Brand" },
      { value: "distributor", label: "Distributor" },
    ],
  },
  secondary: {
    title: "Secondary Order",
    saleType: "secondary",
    sourceOptions: [
      { value: "order_booker", label: "Order Booker" },
      { value: "customer", label: "Customer" },
    ],
  },
};

const statusOptions = ["pending", "approved", "rejected", "dispatched", "delivered"];

function getUnread(order) {
  return Boolean(order.unreadForAdmin || order.unreadForWarehouse);
}

function nextStatuses(order) {
  const current = order.status;
  if (current === "pending") return ["approved", "rejected"];
  if (current === "approved") return ["dispatched", "rejected"];
  if (current === "dispatched") return ["delivered"];
  if (current === "rejected" && order.canRecoverFromRejected) return ["pending", "approved", "dispatched", "delivered"];
  return [];
}

export default function OrderManagementModulePage() {
  const [activeMode, setActiveMode] = useState("");
  const [orders, setOrders] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [regions, setRegions] = useState([]);
  const [zones, setZones] = useState([]);
  const [saving, setSaving] = useState(false);
  const [statusSavingId, setStatusSavingId] = useState("");
  const [previewOrder, setPreviewOrder] = useState(null);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({
    sourceType: "brand",
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
    setForm((prev) => ({ ...prev, sourceType: defaults.sourceOptions[0].value }));
  }, [activeMode]);

  const filteredOrders = useMemo(() => {
    if (!activeMode) return [];
    return orders.filter((order) => order.saleType === modeConfig[activeMode].saleType);
  }, [activeMode, orders]);

  const unreadCount = useMemo(() => filteredOrders.filter(getUnread).length, [filteredOrders]);

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

      if (!targetWarehouse || !items.length || !form.customerName.trim()) {
        throw new Error("Customer/source name, warehouse, and one product row are required");
      }

      await apiFetch("/orders", {
        method: "POST",
        body: {
          saleType: modeConfig[activeMode].saleType,
          sourceType: form.sourceType,
          customerType: form.sourceType === "brand" ? "brand" : form.sourceType,
          customerName: form.customerName,
          fromEntityName: form.customerName,
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
        },
      });

      showToast("success", `${modeConfig[activeMode].title} request created successfully.`);
      setForm((prev) => ({ ...prev, customerName: "", toWarehouseId: "", items: [{ ...emptyItem }] }));
      await loadData();
    } catch (e) {
      showToast("error", e.message || "Failed to submit order request");
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(order, status) {
    setStatusSavingId(order._id);
    try {
      const body = { status };
      if (status === "rejected") {
        const reason = typeof window !== "undefined" ? window.prompt("Rejection reason (optional)", order.rejectionReason || "") : "";
        if (reason) body.rejectionReason = reason;
      }
      await apiFetch(`/orders/${order._id}/status`, { method: "PATCH", body });
      await loadData();
      showToast("success", `Order ${order.orderNo} moved to ${status}.`);
    } catch (e) {
      showToast("error", e.message || "Failed to change status");
    } finally {
      setStatusSavingId("");
    }
  }

  async function markRead(order) {
    try {
      await apiFetch(`/orders/${order._id}/mark-read`, { method: "PATCH" });
      await loadData();
    } catch (e) {
      showToast("error", e.message || "Failed to mark read");
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
          <div className="mt-1 text-sm text-zinc-500">Choose one workflow card to manage request form and ledger.</div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {Object.entries(modeConfig).map(([key, cfg]) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveMode(key)}
                className={`rounded-xl border p-4 text-left transition ${
                  activeMode === key ? "border-emerald-500 bg-emerald-50" : "border-zinc-200 bg-white hover:bg-zinc-50"
                }`}
              >
                <div className="text-lg font-semibold text-zinc-900">{cfg.title}</div>
                <div className="mt-1 text-sm text-zinc-600">Manage requests, approvals, dispatch, delivery, and ledger visibility.</div>
              </button>
            ))}
          </div>
        </section>

        {activeMode ? (
          <section className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="grid gap-8 lg:grid-cols-2">
              <form className="grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={submitOrder}>
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

                <div className="md:col-span-2">
                  <div className="mb-2 font-semibold">Product Detail</div>
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
                    {saving ? "Submitting..." : "Submit Request"}
                  </button>
                </div>
              </form>

              <div className="pt-2">
                <div className="flex items-center justify-between">
                  <div className="text-lg font-semibold text-zinc-900">{modeConfig[activeMode].title} Ledger</div>
                  <div className="rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-700">Unread: {unreadCount}</div>
                </div>
                <div className="mt-3 overflow-x-auto rounded border">
                  <table className="min-w-full text-sm">
                    <thead className="bg-zinc-50"><tr><th className="p-2 text-left">Order Code</th><th className="p-2 text-left">From</th><th className="p-2 text-left">Status</th><th className="p-2 text-left">Actions</th><th className="p-2 text-left">Preview</th></tr></thead>
                    <tbody>
                      {filteredOrders.map((order) => (
                        <tr key={order._id} className={`border-t ${order.status === "rejected" ? "bg-red-50" : order.status === "delivered" ? "bg-emerald-50" : ""}`}>
                          <td className="p-2">
                            {order.orderNo}
                            {getUnread(order) ? <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] text-amber-700">Unread</span> : null}
                          </td>
                          <td className="p-2">{order.customerName}</td>
                          <td className={`p-2 capitalize ${order.status === "rejected" ? "text-red-600" : order.status === "delivered" ? "text-emerald-700" : ""}`}>{order.status}</td>
                          <td className="p-2">
                            <select
                              className="rounded border px-2 py-1 text-xs"
                              value=""
                              disabled={statusSavingId === order._id || !nextStatuses(order).length}
                              onChange={(e) => {
                                if (e.target.value) changeStatus(order, e.target.value);
                              }}
                            >
                              <option value="">Change status...</option>
                              {statusOptions.filter((status) => nextStatuses(order).includes(status)).map((status) => (
                                <option key={status} value={status}>{status}</option>
                              ))}
                            </select>
                          </td>
                          <td className="p-2">
                            <button className="rounded border px-2 py-1 text-xs" onClick={() => { setPreviewOrder(order); markRead(order); }}>Preview</button>
                          </td>
                        </tr>
                      ))}
                      {!filteredOrders.length ? <tr><td colSpan={5} className="p-5 text-center text-zinc-500">No records in this ledger.</td></tr> : null}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {previewOrder ? (
          <section className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">Order Preview: {previewOrder.orderNo}</div>
              <button className="rounded border px-3 py-1 text-sm" onClick={() => setPreviewOrder(null)}>Close</button>
            </div>
            <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
              <div><span className="text-zinc-500">Source:</span> {previewOrder.customerName} ({previewOrder.sourceType})</div>
              <div><span className="text-zinc-500">Warehouse:</span> {previewOrder.toWarehouseName || "-"}</div>
              <div><span className="text-zinc-500">Status:</span> <span className="capitalize">{previewOrder.status}</span></div>
              <div><span className="text-zinc-500">Invoice:</span> {previewOrder.invoiceNo || "Pending"}</div>
              <div><span className="text-zinc-500">Receipt:</span> {(previewOrder.receiptAgreement || "pending").replace("_", " ")}</div>
              <div><span className="text-zinc-500">Proof:</span> {previewOrder.proofOfDeliveryImageUrl || "Pending"}</div>
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