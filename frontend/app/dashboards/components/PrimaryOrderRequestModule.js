"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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


function normalizeRole(value) {
  return String(value || "").toLowerCase().replace(/[^a-z]/g, "");
}

function resolveRequestRole(row) {
  return normalizeRole(row?.requestSourceRole || row?.fromEntityType || "");
}

function matchesDashboardRole(row, role) {
  const requestRole = resolveRequestRole(row);
  const targetRole = normalizeRole(role);
  if (!requestRole || !targetRole) return false;
  if (targetRole === "brandmanager") return requestRole.includes("brandmanager") || requestRole === "brand";
  if (targetRole === "distributor") return requestRole.includes("distributor");
  return requestRole === targetRole;
}

function sourceRoleLabel(row) {
  const role = resolveRequestRole(row);
  if (role.includes("brandmanager") || role === "brand") return "Brand Manager";
  if (role.includes("distributor")) return "Distributor";
  return row?.requestSourceRole || row?.fromEntityType || "-";
}


function normalizeRequestStatus(value) {
  const status = String(value || "").toUpperCase();
  return status === "DISPATCH" ? "DISPATCHED" : status;
}

function requestRowClass(status) {
  if (status === "REJECTED") return "border-b bg-red-50";
  if (status === "APPROVED" || status === "DISPATCHED") return "border-b bg-blue-50";
  if (status === "DELIVERED") return "border-b bg-emerald-50";
  return "border-b";
}

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function getSizeMultiplier(product) {
  if (!product) return 1;
  const raw = String(product.size || "");
  const nums = raw.match(/\d+(?:\.\d+)?/g)?.map(Number) || [];
  if (nums.length) return nums.reduce((acc, n) => acc * n, 1);
  if (toNum(product.packSize) > 0) return toNum(product.packSize);
  return 1;
}

function computeLine(line, product) {
  const qty = toNum(line.qty);
  const rate = toNum(product?.wholesalePrice || 0);
  const gross = qty * rate;
  const toValue = toNum(line.toValue);
  const discValue = line.discValue === "" ? toNum(product?.discountPer || 0) : toNum(line.discValue);
  const extraValue = toNum(line.extraValue);
  const bonsValue = toNum(line.bonsValue);
  const v4gst = gross - toValue - discValue - extraValue - bonsValue;
  const gstPer = toNum(line.gstPer);
  const gstAmount = (v4gst * gstPer) / 100;
  const netAmt = v4gst + gstAmount;
  return { sizeText: product?.size || "-", qty, rate, gross, v4gst, gstAmount, netAmt };
}

export default function PrimaryOrderRequestModule({ role = "Brand Manager" }) {
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [regions, setRegions] = useState([]);
  const [zones, setZones] = useState([]);
  const [requests, setRequests] = useState([]);
  const [me, setMe] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [previewRow, setPreviewRow] = useState(null);
  const [form, setForm] = useState({
    toWarehouseId: "",
    regionId: "",
    zoneId: "",
    territoryName: "",
    address: "",
    extraDiscPer: "0",
    advTaxPer: "0",
    whTaxPer: "0",
    expense: "0",
    items: [{ ...emptyLine }],
  });

  const selectedRegion = useMemo(() => regions.find((item) => item._id === form.regionId), [regions, form.regionId]);
  const selectedZone = useMemo(() => zones.find((item) => item._id === form.zoneId), [zones, form.zoneId]);
  const lineRows = useMemo(() => form.items.map((line, idx) => {
    const product = products.find((p) => p._id === line.productId);
    return { idx, line, product, calc: computeLine(line, product) };
  }), [form.items, products]);
  const totalAmount = useMemo(() => lineRows.reduce((sum, row) => sum + row.calc.netAmt, 0), [lineRows]);
  const extraDiscAmt = useMemo(() => (totalAmount * toNum(form.extraDiscPer)) / 100, [totalAmount, form.extraDiscPer]);
  const advTaxAmt = useMemo(() => (totalAmount * toNum(form.advTaxPer)) / 100, [totalAmount, form.advTaxPer]);
  const whTaxAmt = useMemo(() => (totalAmount * toNum(form.whTaxPer)) / 100, [totalAmount, form.whTaxPer]);
  const grandTotal = useMemo(() => totalAmount - extraDiscAmt + advTaxAmt + whTaxAmt + toNum(form.expense), [totalAmount, extraDiscAmt, advTaxAmt, whTaxAmt, form.expense]);
  const visibleRequests = useMemo(() => {
    const myNames = [me?.businessName, me?.fullName].filter(Boolean).map((v) => String(v).trim().toLowerCase());
    return requests
      .filter((row) => {
        if (!row || row.transactionType !== "SALE_STOCK") return false;
        if (matchesDashboardRole(row, role)) return true;
        const fromName = String(row.fromEntityName || "").trim().toLowerCase();
        return Boolean(fromName) && myNames.includes(fromName);
      })
      .sort((a, b) => new Date(b.transactionAt || b.createdAt || 0).getTime() - new Date(a.transactionAt || a.createdAt || 0).getTime());
  }, [requests, me?.businessName, me?.fullName, role]);

  const loadAll = useCallback(async () => {
    const localUser = typeof window !== "undefined" ? JSON.parse(getAuthItem("aim_user") || "{}") : {};
    const [wRes, pRes, rRes, zRes, meRes, txRes] = await Promise.all([
      apiFetch("/warehouses"),
      apiFetch("/products"),
      apiFetch("/regions"),
      apiFetch("/zones"),
      apiFetch("/users/me"),
      apiFetch("/inventory/transactions"),
    ]);
    const user = meRes?.user || localUser;
    setMe(user);
    setWarehouses(wRes.warehouses || []);
    setProducts(pRes.products || []);
    setRegions(rRes.regions || []);
    setZones(zRes.zones || []);
    setRequests((txRes.transactions || []).filter((row) => row.transactionType === "SALE_STOCK"));
    setForm((prev) => ({
      ...prev,
      regionId: prev.regionId || user?.regionId || "",
      zoneId: prev.zoneId || user?.zoneId || "",
      territoryName: prev.territoryName || user?.territoryName || user?.areaName || "",
      address: prev.address || user?.address || user?.shopAddress || "",
    }));
  }, []);

  useEffect(() => {
    loadAll().catch((e) => showToast("error", e.message || "Failed to load order request module"));
  }, [loadAll]);

  function setField(key, value) { setForm((s) => ({ ...s, [key]: value })); }
  function setItem(index, key, value) { setForm((s) => ({ ...s, items: s.items.map((it, idx) => (idx === index ? { ...it, [key]: value } : it)) })); }
  function addItem() { setForm((s) => ({ ...s, items: [...s.items, { ...emptyLine }] })); }

  async function submitRequest(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const targetWarehouse = warehouses.find((w) => w._id === form.toWarehouseId);
      const normalizedItems = lineRows
        .filter((r) => r.product && r.calc.qty > 0)
        .map((r) => ({
          productId: r.product.productId,
          productName: r.product.name,
          cartonSize: `1x${r.calc.qty || 0}`,
          quantity: r.calc.qty,
          unitPrice: r.calc.rate,
          amount: r.calc.gross,
          stockValue: r.calc.gross,
          note: `to:${toNum(r.line.toValue)},disc:${toNum(r.line.discValue)},extra:${toNum(r.line.extraValue)},bons:${toNum(r.line.bonsValue)},v4gst:${r.calc.v4gst},gst:${r.calc.gstAmount},net:${r.calc.netAmt}`,
        }));

      if (!targetWarehouse || !normalizedItems.length) throw new Error("Select warehouse and at least one product row");

      await apiFetch("/inventory/transactions", {
        method: "POST",
        body: {
          transactionType: "SALE_STOCK",
          warehouseId: targetWarehouse.warehouseId || "",
          warehouseName: targetWarehouse.name || "",
          fromEntityName: me?.businessName || me?.fullName || role,
          fromEntityType: role === "Distributor" ? "DISTRIBUTOR" : "BRAND_MANAGER",
          requestSourceRole: role,
          requestStatus: "PENDING",
          toEntityType: role === "Distributor" ? "DISTRIBUTOR" : "BRAND",
          toEntityName: me?.businessName || me?.fullName || role,
          distributorName: role === "Distributor" ? (me?.businessName || me?.fullName || "") : "",
          brandName: role === "Brand Manager" ? (me?.businessName || me?.fullName || "") : "",
          regionId: selectedRegion?.regionId || me?.regionId || "",
          regionName: selectedRegion?.name || me?.regionName || "",
          zoneId: selectedZone?.zoneId || me?.zoneId || "",
          zoneName: selectedZone?.name || me?.zoneName || "",
          territory: form.territoryName,
          note: form.address,
          extraDiscPer: Number(form.extraDiscPer || 0),
          advTaxPer: Number(form.advTaxPer || 0),
          whTaxPer: Number(form.whTaxPer || 0),
          expense: Number(form.expense || 0),
          subtotal: totalAmount,
          grandTotal,
          items: normalizedItems,
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
          <Select label="To Warehouse" value={form.toWarehouseId} onChange={(v) => setField("toWarehouseId", v)} options={warehouses.map((w) => ({ value: w._id, label: w.name }))} />
          <Input label="Region" value={selectedRegion?.name || me?.regionName || ""} readOnly />
          <Input label="Zone" value={selectedZone?.name || me?.zoneName || ""} readOnly />
          <Input label="Territory" value={form.territoryName} readOnly />
          <Input label="Address" value={form.address} readOnly />

          <div className="md:col-span-2">
            <div className="font-semibold mb-2">Product Detail</div>
            <div className="overflow-x-auto rounded border">
              <table className="min-w-full text-xs">
                <thead><tr className="border-b bg-zinc-50"><th className="p-2">S.No</th><th className="p-2">Product Name</th><th className="p-2">Size</th><th className="p-2">Qty</th><th className="p-2">Rate</th><th className="p-2">Gross</th><th className="p-2">TO</th><th className="p-2">Disc</th><th className="p-2">Extra</th><th className="p-2">Bons</th><th className="p-2">V4GST</th><th className="p-2">GST</th><th className="p-2">Net Amt</th></tr></thead>
                <tbody>
                  {lineRows.map(({ idx, line, product, calc }) => (
                    <tr key={idx} className="border-b">
                      <td className="p-1 text-center">{idx + 1}</td>
                      <td className="p-1 min-w-[180px]"><SelectBare value={line.productId} onChange={(v) => setItem(idx, "productId", v)} options={products.map((p) => ({ value: p._id, label: p.name }))} /></td>
                      <td className="p-1"><InputBare value={calc.sizeText} readOnly /></td>
                      <td className="p-1"><InputBare type="number" value={line.qty} onChange={(v) => setItem(idx, "qty", v)} /></td>
                      <td className="p-1"><InputBare type="number" value={calc.rate} readOnly /></td>
                      <td className="p-1"><InputBare type="number" value={calc.gross.toFixed(2)} readOnly /></td>
                      <td className="p-1"><InputBare type="number" value={line.toValue} readOnly /></td>
                      <td className="p-1"><InputBare type="number" value={line.discValue} readOnly /></td>
                      <td className="p-1"><InputBare type="number" value={line.extraValue} readOnly /></td>
                      <td className="p-1"><InputBare type="number" value={line.bonsValue} readOnly /></td>
                      <td className="p-1"><InputBare type="number" value={calc.v4gst.toFixed(2)} readOnly /></td>
                      <td className="p-1"><InputBare type="number" value={line.gstPer} readOnly /></td>
                      <td className="p-1"><InputBare type="number" value={calc.netAmt.toFixed(2)} readOnly /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" onClick={addItem} className="mt-2 rounded border px-3 py-1 text-sm">+ Add Product</button>
            <div className="grid md:grid-cols-2 gap-4 mt-4 text-sm">
              <div className="rounded border p-3 space-y-2">
                <div>Total amount: <strong>{totalAmount.toFixed(2)}</strong></div>
                <div className="grid grid-cols-3 gap-2 items-center"><span>Extra Disc (%)</span><InputBare type="number" value={form.extraDiscPer} readOnly /><span>{extraDiscAmt.toFixed(2)}</span></div>
                <div className="grid grid-cols-3 gap-2 items-center"><span>Adv Tax (%)</span><InputBare type="number" value={form.advTaxPer} readOnly /><span>{advTaxAmt.toFixed(2)}</span></div>
                <div className="grid grid-cols-3 gap-2 items-center"><span>W.H Tax (%)</span><InputBare type="number" value={form.whTaxPer} readOnly /><span>{whTaxAmt.toFixed(2)}</span></div>
                <div className="grid grid-cols-3 gap-2 items-center"><span>Expense</span><InputBare type="number" value={form.expense} readOnly /><span>{toNum(form.expense).toFixed(2)}</span></div>
              </div>
              <div className="rounded border p-3 text-right"><div className="text-lg font-semibold">Grand Total: {grandTotal.toFixed(2)}</div></div>
            </div>
          </div>

          <div className="md:col-span-2"><button className="rounded-xl bg-emerald-600 text-white px-4 py-2" disabled={saving}>{saving ? "Submitting..." : "Submit Request"}</button></div>
        </form>
      </section>

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold">Order Requests</h3>
        <div className="overflow-x-auto mt-3">
          <table className="min-w-full text-sm">
            <thead><tr className="border-b"><th className="p-2 text-left">Code</th><th className="p-2 text-left">To</th><th className="p-2 text-left">Date and Time</th><th className="p-2 text-left">Status</th><th className="p-2 text-left">Action</th></tr></thead>
            <tbody>
              {visibleRequests.map((row) => (
                <tr key={row._id} className={requestRowClass(normalizeRequestStatus(row.requestStatus || row.status || "PENDING"))}>
                  <td className="p-2">{row.transactionCode || "-"}</td>
                  <td className="p-2">{row.warehouseName || row.toEntityName || "-"}</td>
                  <td className="p-2">{row.transactionAt ? new Date(row.transactionAt).toLocaleString() : "-"}</td>
                  <td className="p-2">{normalizeRequestStatus(row.requestStatus || row.status || "PENDING")}</td>
                  <td className="p-2"><button className="rounded border px-2 py-1" type="button" onClick={() => setPreviewRow(row)}>Preview</button></td>
                </tr>
              ))}
              {!visibleRequests.length ? <tr><td colSpan={5} className="p-4 text-center text-zinc-500">No requests yet.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      {previewRow ? <RequestPreviewModal row={previewRow} onClose={() => setPreviewRow(null)} /> : null}
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

function InputBare({ type = "text", value, onChange = () => {}, readOnly = false }) {
  return <input className="w-full border rounded px-2 py-1 min-w-[90px]" type={type} value={value} readOnly={readOnly} onChange={(e) => onChange(e.target.value)} />;
}

function InlineToast({ type, message }) {
  const classes = type === "success" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-red-300 bg-red-50 text-red-700";
  return <div className={`fixed right-4 top-4 z-50 rounded-xl border px-4 py-3 text-sm shadow ${classes}`}>{message}</div>;
}

function RequestPreviewModal({ row, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <div className="text-lg font-semibold">Request Preview</div>
          <button type="button" className="rounded border px-3 py-1 text-sm" onClick={onClose}>Close</button>
        </div>
        <div className="p-5 text-sm grid md:grid-cols-2 gap-3">
          <PreviewField label="Code" value={row.transactionCode || "-"} />
          <PreviewField label="From" value={row.fromEntityName || "-"} />
          <PreviewField label="To" value={row.warehouseName || row.toEntityName || "-"} />
          <PreviewField label="Source" value={sourceRoleLabel(row)} />
          <PreviewField label="Date and Time" value={row.transactionAt ? new Date(row.transactionAt).toLocaleString() : "-"} />
          <PreviewField label="Status" value={normalizeRequestStatus(row.requestStatus || row.status || "PENDING")} />
        </div>
      </div>
    </div>
  );
}

function PreviewField({ label, value }) {
  return <div><div className="text-zinc-500">{label}</div><div className="font-medium">{value}</div></div>;
}