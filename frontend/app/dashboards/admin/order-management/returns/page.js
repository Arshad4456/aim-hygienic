"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { apiFetch } from "../../../../lib/api";

const emptyLine = {
  productId: "",
  qty: "",
  manufactureDate: "",
  expiryDate: "",
};

function toNum(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function statusTone(status) {
  if (status === "REJECTED") return "bg-red-50";
  if (status === "APPROVED") return "bg-blue-50";
  return "";
}

export default function OrderReturnsPage() {
  const [returns, setReturns] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [regions, setRegions] = useState([]);
  const [zones, setZones] = useState([]);
  const [err, setErr] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    toWarehouseId: "",
    fromEntityType: "BRAND",
    fromEntityName: "",
    regionId: "",
    zoneId: "",
    territory: "",
    note: "",
    items: [{ ...emptyLine }],
  });

  async function loadData() {
    setErr("");
    try {
      const [txRes, wRes, pRes, rRes, zRes] = await Promise.all([
        apiFetch("/inventory/transactions?transactionType=RETURN_STOCK"),
        apiFetch("/warehouses"),
        apiFetch("/products"),
        apiFetch("/regions"),
        apiFetch("/zones"),
      ]);
      setReturns((txRes.transactions || []).sort((a, b) => new Date(b.transactionAt) - new Date(a.transactionAt)));
      setWarehouses(wRes.warehouses || []);
      setProducts(pRes.products || []);
      setRegions(rRes.regions || []);
      setZones(zRes.zones || []);
    } catch (e) {
      setErr(e.message || "Failed to load return stock requests");
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const zonesForRegion = useMemo(() => {
    const region = regions.find((r) => r._id === form.regionId);
    if (!region) return [];
    return zones.filter((z) => z.regionId === region.regionId);
  }, [regions, zones, form.regionId]);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setItem(index, key, value) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((line, idx) => (idx === index ? { ...line, [key]: value } : line)),
    }));
  }

  function addItem() {
    setForm((prev) => ({ ...prev, items: [...prev.items, { ...emptyLine }] }));
  }

  function removeItem(index) {
    setForm((prev) => ({ ...prev, items: prev.items.filter((_, idx) => idx !== index) }));
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError("");
    setSubmitting(true);
    try {
      const toWarehouse = warehouses.find((w) => w._id === form.toWarehouseId);
      const region = regions.find((r) => r._id === form.regionId);
      const zone = zones.find((z) => z._id === form.zoneId);

      const rows = form.items
        .map((line) => ({ line, product: products.find((p) => p._id === line.productId) }))
        .filter((row) => row.product && toNum(row.line.qty) > 0);

      if (!toWarehouse || !rows.length || !form.fromEntityName.trim()) {
        throw new Error("Please select warehouse, source name, and at least one valid product row.");
      }

      const hasMissingDates = rows.some((row) => !row.line.manufactureDate || !row.line.expiryDate);
      if (hasMissingDates) {
        throw new Error("Manufacture date and expiry date are required for return stock items");
      }

      const items = rows.map(({ line, product }) => {
        const qty = toNum(line.qty);
        const unitPrice = toNum(product.wholesalePrice || 0);
        return {
          productId: product.productId,
          productName: product.name,
          cartonSize: `1x${qty}`,
          cartons: 1,
          totalPacks: qty,
          packsPerCarton: qty,
          onePackPrice: unitPrice,
          oneCartonPrice: unitPrice,
          totalPrice: unitPrice * qty,
          unitPrice,
          manufactureDate: line.manufactureDate,
          expiryDate: line.expiryDate,
        };
      });

      const fromType = String(form.fromEntityType || "BRAND").toUpperCase();
      const fromName = form.fromEntityName.trim();
      await apiFetch("/inventory/transactions", {
        method: "POST",
        body: {
          transactionType: "RETURN_STOCK",
          warehouseId: toWarehouse.warehouseId,
          warehouseName: toWarehouse.name,
          fromEntityType: fromType,
          fromEntityName: fromName,
          distributorName: fromType === "DISTRIBUTOR" ? fromName : "",
          brandName: fromType === "BRAND" ? fromName : "",
          toEntityName: toWarehouse.name,
          regionId: region?.regionId || "",
          regionName: region?.name || "",
          zoneId: zone?.zoneId || "",
          zoneName: zone?.name || "",
          territory: form.territory || "",
          note: form.note || "",
          requestSourceRole: "Order Management",
          items,
        },
      });

      setForm({
        toWarehouseId: "",
        fromEntityType: "BRAND",
        fromEntityName: "",
        regionId: "",
        zoneId: "",
        territory: "",
        note: "",
        items: [{ ...emptyLine }],
      });
      await loadData();
    } catch (e) {
      setSubmitError(e.message || "Failed to submit return request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminShell title="Returns & Claims" user={null}>
      <div className="space-y-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="text-xl font-semibold text-zinc-900">Return Stock Request</div>
          <div className="text-sm text-zinc-500 mt-1">This module now submits to the warehouse/inventory return stock backend.</div>

          {submitError ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{submitError}</div> : null}

          <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
            <FieldSelect
              label="To Warehouse"
              value={form.toWarehouseId}
              onChange={(value) => setField("toWarehouseId", value)}
              options={warehouses.map((w) => ({ value: w._id, label: w.name }))}
              required
            />
            <FieldSelect
              label="Source Type"
              value={form.fromEntityType}
              onChange={(value) => setField("fromEntityType", value)}
              options={[{ value: "BRAND", label: "Brand" }, { value: "DISTRIBUTOR", label: "Distributor" }]}
            />
            <FieldInput label="Source Name" value={form.fromEntityName} onChange={(value) => setField("fromEntityName", value)} required />
            <FieldSelect
              label="Region"
              value={form.regionId}
              onChange={(value) => {
                setField("regionId", value);
                setField("zoneId", "");
              }}
              options={regions.map((r) => ({ value: r._id, label: r.name }))}
            />
            <FieldSelect
              label="Zone"
              value={form.zoneId}
              onChange={(value) => setField("zoneId", value)}
              options={zonesForRegion.map((z) => ({ value: z._id, label: z.name }))}
            />
            <FieldInput label="Territory" value={form.territory} onChange={(value) => setField("territory", value)} />
            <div className="md:col-span-2">
              <FieldInput label="Note" value={form.note} onChange={(value) => setField("note", value)} />
            </div>

            <div className="md:col-span-2 overflow-auto rounded-xl border">
              <table className="min-w-[780px] w-full text-sm">
                <thead className="bg-zinc-50">
                  <tr>
                    <th className="px-3 py-2 border-b text-left">Product</th>
                    <th className="px-3 py-2 border-b text-left">Qty</th>
                    <th className="px-3 py-2 border-b text-left">MFG Date</th>
                    <th className="px-3 py-2 border-b text-left">EXP Date</th>
                    <th className="px-3 py-2 border-b text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {form.items.map((line, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2 border-b">
                        <select
                          className="w-full rounded-lg border px-2 py-1"
                          value={line.productId}
                          onChange={(event) => setItem(idx, "productId", event.target.value)}
                        >
                          <option value="">Select</option>
                          {products.map((p) => (
                            <option key={p._id} value={p._id}>{`${p.productId} - ${p.name}`}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2 border-b"><input type="number" min="0" className="w-full rounded-lg border px-2 py-1" value={line.qty} onChange={(event) => setItem(idx, "qty", event.target.value)} /></td>
                      <td className="px-3 py-2 border-b"><input type="date" className="w-full rounded-lg border px-2 py-1" value={line.manufactureDate} onChange={(event) => setItem(idx, "manufactureDate", event.target.value)} /></td>
                      <td className="px-3 py-2 border-b"><input type="date" className="w-full rounded-lg border px-2 py-1" value={line.expiryDate} onChange={(event) => setItem(idx, "expiryDate", event.target.value)} /></td>
                      <td className="px-3 py-2 border-b"><button type="button" className="rounded border px-2 py-1" onClick={() => removeItem(idx)}>Remove</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-3 border-t bg-zinc-50"><button type="button" className="rounded border px-3 py-1 text-sm" onClick={addItem}>+ Add Product</button></div>
            </div>

            <div className="md:col-span-2 flex justify-end">
              <button type="submit" disabled={submitting} className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                {submitting ? "Submitting..." : "Submit Return"}
              </button>
            </div>
          </form>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="text-lg font-semibold text-zinc-900">Return Requests</div>
          <div className="text-sm text-zinc-500 mt-1">Shows requests from both warehouse/inventory and order management flows (shared backend).</div>

          {err ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div> : null}

          <div className="mt-4 overflow-auto rounded-xl border">
            <table className="min-w-[760px] w-full text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="text-left px-3 py-2 border-b">Code</th>
                  <th className="text-left px-3 py-2 border-b">From</th>
                  <th className="text-left px-3 py-2 border-b">Type</th>
                  <th className="text-left px-3 py-2 border-b">Warehouse</th>
                  <th className="text-left px-3 py-2 border-b">Status</th>
                  <th className="text-left px-3 py-2 border-b">Date</th>
                </tr>
              </thead>
              <tbody>
                {returns.length ? (
                  returns.map((claim) => {
                    const status = String(claim.requestStatus || "PENDING").toUpperCase();
                    return (
                      <tr key={claim._id} className={statusTone(status)}>
                        <td className="px-3 py-2 border-b font-medium text-zinc-900">{claim.transactionCode}</td>
                        <td className="px-3 py-2 border-b">{claim.fromEntityName || "-"}</td>
                        <td className="px-3 py-2 border-b">{claim.fromEntityType || "-"}</td>
                        <td className="px-3 py-2 border-b">{claim.warehouseName || "-"}</td>
                        <td className="px-3 py-2 border-b">{status}</td>
                        <td className="px-3 py-2 border-b">{claim.transactionAt ? new Date(claim.transactionAt).toLocaleString() : "-"}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-zinc-500">No return requests yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

function FieldInput({ label, value, onChange, required = false }) {
  return (
    <div>
      <label className="text-xs font-semibold text-zinc-600">{label}</label>
      <input className="mt-2 w-full rounded-xl border px-3 py-2 text-sm" value={value} onChange={(event) => onChange(event.target.value)} required={required} />
    </div>
  );
}

function FieldSelect({ label, value, onChange, options, required = false }) {
  return (
    <div>
      <label className="text-xs font-semibold text-zinc-600">{label}</label>
      <select className="mt-2 w-full rounded-xl border px-3 py-2 text-sm" value={value} onChange={(event) => onChange(event.target.value)} required={required}>
        <option value="">Select</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  );
}
