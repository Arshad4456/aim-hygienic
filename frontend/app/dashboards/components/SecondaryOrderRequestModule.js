"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import UserDashboardShell from "./userDashboardShell";
import { apiFetch } from "../../lib/api";

const emptyLine = { productId: "", qty: "" };

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function computeLine(line, product) {
  const qty = toNum(line.qty);
  const rate = toNum(product?.wholesalePrice || 0);
  const gross = qty * rate;
  return { qty, rate, gross, toValue: 0, discValue: 0, extraValue: 0, bonsValue: 0, v4gst: gross, gstPer: 0, gst: 0, net: gross };
}

function buildDistributorOptions(user) {
  if (!user) return [];

  const candidates = [
    {
      id: user.distributorId,
      name: user.distributorName,
      warehouseId: user.warehouseId,
    },
    {
      id: user.managerId,
      name: user.managerName,
      warehouseId: user.warehouseId,
    },
    {
      id: user.warehouseId,
      name: user.warehouseName,
      warehouseId: user.warehouseId,
    },
  ].filter((entry) => entry.id || entry.name);

  const seen = new Set();
  return candidates
    .map((entry) => {
      const optionId = String(entry.id || entry.name || "").trim();
      const optionName = String(entry.name || "").trim();
      if (!optionId || seen.has(optionId)) return null;
      seen.add(optionId);
      return {
        _id: optionId,
        userId: String(entry.id || "").trim(),
        businessName: optionName,
        fullName: optionName,
        warehouseId: String(entry.warehouseId || "").trim(),
      };
    })
    .filter(Boolean);
}

export default function SecondaryOrderRequestModule({ roleKey, links, title }) {
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [distributors, setDistributors] = useState([]);
  const [orders, setOrders] = useState([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({
    customerName: "",
    businessName: "",
    address: "",
    distributorId: "",
    items: [{ ...emptyLine }],
  });

  const loadData = useCallback(async () => {
    setErr("");

    const [meResult, productsResult, ordersResult] = await Promise.allSettled([
      apiFetch("/users/me"),
      apiFetch("/products"),
      apiFetch("/orders/my?limit=200"),
    ]);

    const me = meResult.status === "fulfilled" ? (meResult.value?.user || null) : null;
    const productsData = productsResult.status === "fulfilled" ? (productsResult.value?.products || []) : [];
    const myOrders = ordersResult.status === "fulfilled" ? (ordersResult.value?.orders || []) : [];

    if (meResult.status === "rejected") {
      setErr(meResult.reason?.message || "Failed to load profile data");
    } else if (productsResult.status === "rejected") {
      setErr(productsResult.reason?.message || "Failed to load products");
    } else if (ordersResult.status === "rejected") {
      setErr(ordersResult.reason?.message || "Failed to load orders");
    }

    const distributorOptions = buildDistributorOptions(me);

    setUser(me);
    setProducts(productsData);
    setDistributors(distributorOptions);
    setOrders(myOrders.filter((o) => o.saleType === "secondary"));
    setForm((prev) => ({
      ...prev,
      customerName: roleKey === "customer" ? (me?.fullName || me?.customerName || "") : prev.customerName,
      businessName: roleKey === "customer" ? (me?.businessName || "") : prev.businessName,
      address: roleKey === "customer" ? (me?.address || me?.shopAddress || "") : prev.address,
      distributorId: distributorOptions.some((d) => d._id === prev.distributorId) ? prev.distributorId : (distributorOptions[0]?._id || ""),
    }));
  }, [roleKey]);

  useEffect(() => { loadData(); }, [loadData]);

  const lines = useMemo(() => form.items.map((line) => {
    const product = products.find((p) => p._id === line.productId);
    return { line, product, calc: computeLine(line, product) };
  }), [form.items, products]);

  const total = useMemo(() => lines.reduce((sum, row) => sum + row.calc.net, 0), [lines]);

  function setField(key, value) { setForm((s) => ({ ...s, [key]: value })); }
  function setItem(idx, key, value) { setForm((s) => ({ ...s, items: s.items.map((it, i) => i === idx ? { ...it, [key]: value } : it) })); }
  function addItem() { setForm((s) => ({ ...s, items: [...s.items, { ...emptyLine }] })); }
  function removeItem(idx) { setForm((s) => ({ ...s, items: s.items.filter((_, i) => i !== idx) })); }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setErr("");
    try {
      const distributor = distributors.find((d) => d._id === form.distributorId);
      const rows = lines.filter((r) => r.product && r.calc.qty > 0);
      if (!distributor) throw new Error("Distributor is required. Please assign a distributor to this user.");
      if (!rows.length) throw new Error("Please add at least one product row.");

      const customerName = roleKey === "customer" ? (user?.fullName || user?.customerName || "") : form.customerName;
      const businessName = roleKey === "customer" ? (user?.businessName || "") : form.businessName;
      const address = roleKey === "customer" ? (user?.address || user?.shopAddress || "") : form.address;

      const items = rows.map((r) => ({
        productName: r.product.name,
        productCode: r.product.productId,
        quantity: r.calc.qty,
        unitPrice: r.calc.rate,
        toValue: 0,
        discValue: 0,
        extraValue: 0,
        bonsValue: 0,
        gstPer: 0,
      }));

      await apiFetch("/orders", {
        method: "POST",
        body: {
          saleType: "secondary",
          sourceType: roleKey === "customer" ? "customer" : "order_booker",
          customerType: "customer",
          customerName,
          fromEntityName: customerName,
          fromEntityRole: roleKey === "customer" ? "customer" : "Order Booker",
          distributorId: distributor.userId || distributor._id,
          toWarehouseId: distributor.warehouseId || "",
          toWarehouseName: distributor.businessName || distributor.fullName || "",
          regionId: user?.regionId || "",
          regionName: user?.regionName || "",
          zoneId: user?.zoneId || "",
          zoneName: user?.zoneName || "",
          territoryName: user?.territoryName || user?.areaName || "",
          address,
          notes: `Business: ${businessName}`,
          items,
          totalAmount: total,
        },
      });

      await loadData();
      setForm((s) => ({ ...s, customerName: roleKey === "customer" ? s.customerName : "", businessName: roleKey === "customer" ? s.businessName : "", address: roleKey === "customer" ? s.address : "", items: [{ ...emptyLine }] }));
    } catch (e2) {
      setErr(e2.message || "Failed to submit request");
    } finally {
      setSaving(false);
    }
  }

  const distributor = distributors.find((d) => d._id === form.distributorId);

  return (
    <UserDashboardShell title={title} subtitle="Order Management" roleKey={roleKey === "customer" ? "customer" : "Order Booker"} links={links} showAccountCards>
      <div className="space-y-6">
        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold">Create Order</h3>
          {err ? <div className="mt-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div> : null}
          <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 text-sm">
            <div className="font-semibold">From</div><div className="font-semibold">To</div>
            <Input label="Source" value={roleKey === "customer" ? "customer" : "Order Booker"} readOnly />
            <label>
              <div className="text-zinc-600">Distributor</div>
              <select className="mt-1 w-full rounded border px-3 py-2" value={form.distributorId} onChange={(e) => setField("distributorId", e.target.value)}>
                <option value="">Select Distributor</option>
                {distributors.map((d) => <option key={d._id} value={d._id}>{d.businessName || d.fullName || d.userId}</option>)}
              </select>
            </label>
            <Input label={roleKey === "customer" ? "Customer Name" : "Order Booker Name"} value={roleKey === "customer" ? (user?.fullName || user?.customerName || "") : (user?.fullName || "")} readOnly />
            <Input label="Region" value={user?.regionName || ""} readOnly />
            <Input label="Zone" value={user?.zoneName || ""} readOnly />
            <Input label="Territory" value={user?.territoryName || user?.areaName || ""} readOnly />
            <Input label="Field" value={user?.fieldName || ""} readOnly />
            <div />
            <Input label="Customer Name" value={roleKey === "customer" ? (user?.fullName || user?.customerName || "") : form.customerName} onChange={(v) => setField("customerName", v)} readOnly={roleKey === "customer"} />
            <Input label="Bussiness Name" value={roleKey === "customer" ? (user?.businessName || "") : form.businessName} onChange={(v) => setField("businessName", v)} readOnly={roleKey === "customer"} />
            <div className="md:col-span-2"><Input label="Address" value={roleKey === "customer" ? (user?.address || user?.shopAddress || "") : form.address} onChange={(v) => setField("address", v)} readOnly={roleKey === "customer"} /></div>

            <div className="md:col-span-2 mt-2">
              <div className="font-semibold mb-2">Product Detail</div>
              <div className="overflow-x-auto rounded border">
                <table className="min-w-full text-xs">
                  <thead><tr className="border-b bg-zinc-50"><th className="p-2">Product Name</th><th className="p-2">Qty</th><th className="p-2">Rate</th><th className="p-2">Gross</th><th className="p-2">TO</th><th className="p-2">Disc</th><th className="p-2">Extra</th><th className="p-2">Bons</th><th className="p-2">V4GST</th><th className="p-2">GST</th><th className="p-2">Net</th><th className="p-2">-</th></tr></thead>
                  <tbody>
                    {lines.map((row, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="p-1"><select className="w-full rounded border px-2 py-1" value={row.line.productId} onChange={(e) => setItem(idx, "productId", e.target.value)}><option value="">Select</option>{products.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}</select></td>
                        <td className="p-1"><input className="w-full rounded border px-2 py-1" type="number" min="0" value={row.line.qty} onChange={(e) => setItem(idx, "qty", e.target.value)} /></td>
                        <td className="p-1">{row.calc.rate.toFixed(2)}</td>
                        <td className="p-1">{row.calc.gross.toFixed(2)}</td>
                        <td className="p-1">0.00</td><td className="p-1">0.00</td><td className="p-1">0.00</td><td className="p-1">0.00</td><td className="p-1">{row.calc.v4gst.toFixed(2)}</td><td className="p-1">0.00</td><td className="p-1">{row.calc.net.toFixed(2)}</td>
                        <td className="p-1"><button type="button" className="rounded border px-2 py-1" onClick={() => removeItem(idx)}>X</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 flex justify-end text-sm">
                <div className="rounded border bg-zinc-50 px-3 py-2 font-semibold">Total Amount: {total.toFixed(2)}</div>
              </div>
              <button type="button" className="mt-2 rounded border px-3 py-1" onClick={addItem}>+ Add Product</button>
            </div>

            <div className="md:col-span-2"><button disabled={saving} className="rounded bg-emerald-600 px-4 py-2 text-white">{saving ? "Submitting..." : "Submit Request"}</button></div>
          </form>
        </section>

        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold">{roleKey === "customer" ? "Order List" : "Booked Order list"}</h3>
          <div className="overflow-x-auto mt-2 rounded border">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-50"><tr><th className="p-2 text-left">Order-No</th>{roleKey === "customer" ? <th className="p-2 text-left">To</th> : <><th className="p-2 text-left">Source</th><th className="p-2 text-left">Customer Name</th></>}<th className="p-2 text-left">Date/Time</th><th className="p-2 text-left">Status</th>{roleKey === "customer" ? null : <th className="p-2 text-left">Action</th>}</tr></thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o._id} className="border-b">
                    <td className="p-2">{o.orderNo}</td>
                    {roleKey === "customer" ? <td className="p-2">{o.toWarehouseName || "-"}</td> : <><td className="p-2">{o.sourceType}</td><td className="p-2">{o.customerName}</td></>}
                    <td className="p-2">{o.createdAt ? new Date(o.createdAt).toLocaleString() : "-"}</td>
                    <td className="p-2 capitalize">{o.status}</td>
                    {roleKey === "customer" ? null : <td className="p-2"><button type="button" className="rounded border px-2 py-1" onClick={() => window.print()}>Receipt/Invoice</button></td>}
                  </tr>
                ))}
                {!orders.length ? <tr><td colSpan={roleKey === "customer" ? 4 : 6} className="p-4 text-center text-zinc-500">No orders found.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </UserDashboardShell>
  );
}

function Input({ label, value, onChange, readOnly = false }) {
  return <label><div className="text-zinc-600">{label}</div><input className="mt-1 w-full rounded border px-3 py-2" value={value || ""} readOnly={readOnly} onChange={(e) => onChange?.(e.target.value)} /></label>;
}
