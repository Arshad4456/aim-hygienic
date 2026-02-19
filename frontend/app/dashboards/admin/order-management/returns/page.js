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

function sourceRoleLabel(row) {
  const source = String(row?.requestSourceRole || row?.fromEntityType || "").toLowerCase().replace(/[^a-z]/g, "");
  if (source.includes("brandmanager") || source === "brand") return "Brand Manager";
  if (source.includes("distributor")) return "Distributor";
  if (source.includes("ordermanagement")) return "Order Management";
  return row?.requestSourceRole || row?.fromEntityType || "-";
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
  const [updatingId, setUpdatingId] = useState("");
  const [previewRow, setPreviewRow] = useState(null);
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

  async function markRequestRead(id) {
    setUpdatingId(id);
    try {
      await apiFetch(`/inventory/transactions/${id}/mark-read`, { method: "PUT", body: {} });
      await loadData();
    } catch (e) {
      setErr(e.message || "Failed to open request");
    } finally {
      setUpdatingId("");
    }
  }

  async function updateRequestStatus(id, status) {
    setUpdatingId(id);
    try {
      await apiFetch(`/inventory/transactions/${id}/request-status`, { method: "PUT", body: { status } });
      await loadData();
    } catch (e) {
      setErr(e.message || "Failed to update request status");
    } finally {
      setUpdatingId("");
    }
  }

  async function deleteRequest(id) {
    if (!window.confirm("Delete this return stock request?")) return;
    setUpdatingId(id);
    try {
      await apiFetch(`/inventory/transactions/${id}`, { method: "DELETE" });
      await loadData();
    } catch (e) {
      setErr(e.message || "Failed to delete return stock request");
    } finally {
      setUpdatingId("");
    }
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
          <div className="text-sm text-zinc-500 mt-1">Uses same backend and same request workflow as Warehouse & Inventory return stock.</div>

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
              <FieldInput label="Address" value={form.note} onChange={(value) => setField("note", value)} />
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
                    <tr key={idx} className="border-b">
                      <td className="px-3 py-2">
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
                      <td className="px-3 py-2"><input type="number" min="0" className="w-full rounded-lg border px-2 py-1" value={line.qty} onChange={(event) => setItem(idx, "qty", event.target.value)} /></td>
                      <td className="px-3 py-2"><input type="date" className="w-full rounded-lg border px-2 py-1" value={line.manufactureDate} onChange={(event) => setItem(idx, "manufactureDate", event.target.value)} /></td>
                      <td className="px-3 py-2"><input type="date" className="w-full rounded-lg border px-2 py-1" value={line.expiryDate} onChange={(event) => setItem(idx, "expiryDate", event.target.value)} /></td>
                      <td className="px-3 py-2"><button type="button" className="rounded border px-2 py-1" onClick={() => removeItem(idx)}>Remove</button></td>
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
          <div className="text-lg font-semibold text-zinc-900">Requests Return Stocks</div>
          <div className="text-sm text-zinc-500 mt-1">Same action buttons and workflow as Warehouse & Inventory return stock requests.</div>

          {err ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div> : null}

          <div className="mt-4 overflow-auto rounded-xl border">
            <table className="min-w-[920px] w-full text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="text-left px-3 py-2 border-b">Code</th>
                  <th className="text-left px-3 py-2 border-b">From</th>
                  <th className="text-left px-3 py-2 border-b">Source</th>
                  <th className="text-left px-3 py-2 border-b">Date and Time</th>
                  <th className="text-left px-3 py-2 border-b">Status</th>
                  <th className="text-left px-3 py-2 border-b">Unread</th>
                  <th className="text-left px-3 py-2 border-b">Action</th>
                </tr>
              </thead>
              <tbody>
                {returns.length ? (
                  returns.map((row) => {
                    const status = normalizeRequestStatus(row.requestStatus || "PENDING");
                    const unread = !row.requestReadAt;
                    return (
                      <tr key={row._id} className={requestRowClass(status)}>
                        <td className="px-3 py-2">{row.transactionCode}</td>
                        <td className="px-3 py-2">{row.fromEntityName || "-"}</td>
                        <td className="px-3 py-2">{sourceRoleLabel(row)}</td>
                        <td className="px-3 py-2">{row.transactionAt ? new Date(row.transactionAt).toLocaleString() : "-"}</td>
                        <td className="px-3 py-2">{status}</td>
                        <td className="px-3 py-2">{unread ? <span className="rounded bg-amber-100 px-2 py-1 text-xs text-amber-800">Unread</span> : "Read"}</td>
                        <td className="px-3 py-2">
                          <div className="flex gap-2 flex-wrap">
                            <button className="rounded border px-2 py-1" onClick={() => markRequestRead(row._id)} disabled={updatingId === row._id}>Open</button>
                            <button className="rounded border border-emerald-300 px-2 py-1 text-emerald-700" onClick={() => setPreviewRow(row)}>Preview</button>
                            {status === "PENDING" ? (
                              <>
                                <button className="rounded border border-blue-300 px-2 py-1 text-blue-700" onClick={() => updateRequestStatus(row._id, "APPROVED")} disabled={updatingId === row._id}>Approve</button>
                                <button className="rounded border border-red-300 px-2 py-1 text-red-700" onClick={() => updateRequestStatus(row._id, "REJECTED")} disabled={updatingId === row._id}>Reject</button>
                              </>
                            ) : null}
                            <button className="rounded border border-red-300 text-red-700 px-2 py-1" onClick={() => deleteRequest(row._id)} disabled={updatingId === row._id}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-zinc-500">No return requests yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <RequestPreviewModal row={previewRow} onClose={() => setPreviewRow(null)} />
    </AdminShell>
  );
}

function RequestPreviewModal({ row, onClose }) {
  if (!row) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <div>
            <div className="text-lg font-semibold">Return Request Preview</div>
            <div className="text-sm text-zinc-500">{row.transactionCode || "-"}</div>
          </div>
          <button type="button" className="rounded border px-3 py-1 text-sm" onClick={onClose}>Close</button>
        </div>

        <div className="max-h-[70vh] overflow-auto p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <PreviewField label="From" value={row.fromEntityName || "-"} />
            <PreviewField label="Source" value={sourceRoleLabel(row)} />
            <PreviewField label="Region" value={row.regionName || row.regionId || "-"} />
            <PreviewField label="Zone" value={row.zoneName || row.zoneId || "-"} />
            <PreviewField label="Territory" value={row.territory || "-"} />
            <PreviewField label="To" value={row.toEntityName || row.warehouseName || "-"} />
            <div className="md:col-span-2">
              <PreviewField label="Address" value={row.note || "-"} />
            </div>
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-3 py-2 text-left border-b">Product</th>
                  <th className="px-3 py-2 text-left border-b">Quantity</th>
                  <th className="px-3 py-2 text-left border-b">Manufacture Date</th>
                  <th className="px-3 py-2 text-left border-b">Expiry Date</th>
                </tr>
              </thead>
              <tbody>
                {(row.items || []).map((item, idx) => (
                  <tr key={`${item.productId || item.productName}-${idx}`} className="border-b">
                    <td className="px-3 py-2">{item.productName || item.productId || "-"}</td>
                    <td className="px-3 py-2">{item.totalPacks ?? item.qty ?? "-"}</td>
                    <td className="px-3 py-2">{item.manufactureDate ? new Date(item.manufactureDate).toLocaleDateString() : "-"}</td>
                    <td className="px-3 py-2">{item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewField({ label, value }) {
  return (
    <div>
      <div className="text-xs font-medium text-zinc-500">{label}</div>
      <div className="mt-1 rounded border bg-zinc-50 px-3 py-2 text-sm">{value || "-"}</div>
    </div>
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
