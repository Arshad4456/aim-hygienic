"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/api";

function rowClass(status) {
  const s = String(status || "").toLowerCase();
  if (s === "rejected") return "border-b bg-red-50";
  if (s === "approved" || s === "dispatched") return "border-b bg-blue-50";
  return "border-b";
}

function toStatusLabel(status) {
  return String(status || "pending").toUpperCase();
}

function podUploaderName(row) {
  return row?.podUploadedBy?.name || row?.pod_uploaded_by?.name || row?.podUploadedBy || row?.proofOfDeliveryBy || "-";
}

function parseNoteMap(value) {
  return Object.fromEntries(
    String(value || "")
      .split(",")
      .map((seg) => seg.split(":"))
      .filter((parts) => parts.length >= 2),
  );
}

export default function DistributorSecondaryOrdersModule() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [previewRow, setPreviewRow] = useState(null);

  const notify = useCallback((type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 2500);
  }, []);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/orders/secondary/distributor?limit=500");
      setOrders(res?.orders || []);
    } catch (error) {
      notify("error", error?.message || "Failed to load secondary orders");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const requestRows = useMemo(
    () => orders.filter((row) => ["pending", "approved", "rejected", "dispatched"].includes(String(row.status || "").toLowerCase())),
    [orders],
  );

  const ledgerRows = useMemo(() => orders, [orders]);

  async function openRequest(id) {
    try {
      await apiFetch(`/orders/${id}/mark-read`, { method: "PATCH" });
      notify("success", "Request opened.");
      await loadOrders();
    } catch (error) {
      notify("error", error?.message || "Failed to open request");
    }
  }

  async function updateStatus(id, status) {
    try {
      await apiFetch(`/orders/${id}/status`, { method: "PATCH", body: { status } });
      notify("success", `Request ${status} successfully.`);
      await loadOrders();
    } catch (error) {
      notify("error", error?.message || "Failed to update request status");
    }
  }

  async function deleteOrder(id) {
    try {
      await apiFetch(`/orders/${id}`, { method: "DELETE" });
      notify("success", "Order deleted.");
      await loadOrders();
    } catch (error) {
      notify("error", error?.message || "Failed to delete order");
    }
  }

  function printInvoice(order) {
    const html = `
      <html><body style="font-family:Arial;padding:16px;">
        <h2>Secondary Order Invoice/Receipt</h2>
        <div><strong>Invoice #:</strong> ${order.orderNo || "-"}</div>
        <div><strong>Invoice From:</strong> ${order.toWarehouseName || "-"}</div>
        <div><strong>Bill To:</strong> ${order.customerName || order.fromEntityName || "-"}</div>
        <div><strong>Date:</strong> ${order.createdAt ? new Date(order.createdAt).toLocaleString() : "-"}</div>
        <table border="1" cellspacing="0" cellpadding="6" style="margin-top:12px;border-collapse:collapse;width:100%">
          <thead><tr><th>#</th><th>Product</th><th>Section</th><th>Qty</th><th>Rate</th></tr></thead>
          <tbody>
            ${(order.items || []).map((it, i) => `<tr><td>${i + 1}</td><td>${it.productName || "-"}</td><td>${it.section || order.saleType || "secondary"}</td><td>${it.quantity || 0}</td><td>${it.unitPrice || 0}</td></tr>`).join("") || '<tr><td colspan="5">No items</td></tr>'}
          </tbody>
        </table>
      </body></html>`;
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  }

  return (
    <div className="space-y-6 mt-6">
      {toast ? <InlineToast type={toast.type} message={toast.message} /> : null}

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold">Secondary Order Request list</h3>
        <div className="overflow-x-auto mt-3 rounded border">
          <table className="min-w-full text-sm">
            <thead><tr className="border-b bg-zinc-50"><th className="p-2 text-left">Order No</th><th className="p-2 text-left">Source</th><th className="p-2 text-left">From</th><th className="p-2 text-left">To</th><th className="p-2 text-left">Date/Time</th><th className="p-2 text-left">Status</th><th className="p-2 text-left">POD</th><th className="p-2 text-left">Read/Unread</th><th className="p-2 text-left">Action</th></tr></thead>
            <tbody>
              {requestRows.map((row) => (
                <tr key={row._id} className={rowClass(row.status)}>
                  <td className="p-2">{row.orderNo || "-"}</td>
                  <td className="p-2">{row.sourceType || "-"}</td>
                  <td className="p-2">{row.fromEntityName || row.customerName || "-"}</td>
                  <td className="p-2">{row.toWarehouseName || "-"}</td>
                  <td className="p-2">{row.createdAt ? new Date(row.createdAt).toLocaleString() : "-"}</td>
                  <td className="p-2">{toStatusLabel(row.status)}</td>
                  <td className="p-2">{row.podUrl ? <span className="rounded bg-emerald-100 px-2 py-1 text-xs text-emerald-700">Uploaded</span> : <span className="rounded bg-zinc-100 px-2 py-1 text-xs text-zinc-600">Not Uploaded</span>}</td>
                  <td className="p-2">{row.unreadForDistributor ? "Unread" : "Read"}</td>
                  <td className="p-2"><div className="flex flex-wrap gap-2"><button className="rounded border px-2 py-1" onClick={() => openRequest(row._id)}>Open</button><button className="rounded border px-2 py-1" onClick={() => setPreviewRow(row)}>Preview/Edit</button><button className="rounded border border-red-300 px-2 py-1 text-red-700" onClick={() => updateStatus(row._id, "rejected")}>Reject</button><button className="rounded border border-blue-300 px-2 py-1 text-blue-700" onClick={() => updateStatus(row._id, "approved")}>Approve</button><button className="rounded border border-indigo-300 px-2 py-1 text-indigo-700" onClick={() => updateStatus(row._id, "dispatched")}>Dispatched</button><button className="rounded border border-emerald-400 px-2 py-1 text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50" disabled={!row.podUrl} title={!row.podUrl ? "Upload POD required before marking delivered." : ""} onClick={() => updateStatus(row._id, "delivered")}>Delivered</button></div></td>
                </tr>
              ))}
              {!requestRows.length ? <tr><td colSpan={9} className="p-4 text-center text-zinc-500">{loading ? "Loading..." : "No secondary requests."}</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold">Secondary Orders Ledger</h3>
        <div className="overflow-x-auto mt-3 rounded border">
          <table className="min-w-full text-sm">
            <thead><tr className="border-b bg-zinc-50"><th className="p-2 text-left">Order No</th><th className="p-2 text-left">Source</th><th className="p-2 text-left">From</th><th className="p-2 text-left">To</th><th className="p-2 text-left">Date/Time (read-only)</th><th className="p-2 text-left">POD</th><th className="p-2 text-left">Action</th></tr></thead>
            <tbody>
              {ledgerRows.map((row) => (
                <tr key={row._id} className="border-b">
                  <td className="p-2">{row.orderNo || "-"}</td>
                  <td className="p-2">{row.sourceType || "-"}</td>
                  <td className="p-2">{row.fromEntityName || row.customerName || "-"}</td>
                  <td className="p-2">{row.toWarehouseName || "-"}</td>
                  <td className="p-2">{row.createdAt ? new Date(row.createdAt).toLocaleString() : "-"}</td>
                  <td className="p-2">{row.podUrl ? <span className="rounded bg-emerald-100 px-2 py-1 text-xs text-emerald-700">Uploaded</span> : <span className="rounded bg-zinc-100 px-2 py-1 text-xs text-zinc-600">Not Uploaded</span>}</td>
                  <td className="p-2"><div className="flex gap-2"><button className="rounded border px-2 py-1" onClick={() => setPreviewRow(row)}>Preview/Edit</button><button className="rounded border px-2 py-1" onClick={() => printInvoice(row)}>Invoice/Receipt</button><button className="rounded border border-red-300 px-2 py-1 text-red-700" onClick={() => deleteOrder(row._id)}>Delete</button></div></td>
                </tr>
              ))}
              {!ledgerRows.length ? <tr><td colSpan={7} className="p-4 text-center text-zinc-500">{loading ? "Loading..." : "No secondary order ledger records."}</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      {previewRow ? <PreviewModal row={previewRow} onClose={() => setPreviewRow(null)} onSaved={loadOrders} onNotify={notify} /> : null}
    </div>
  );
}

function InlineToast({ type, message }) {
  const classes = type === "success" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-red-300 bg-red-50 text-red-700";
  return <div className={`fixed right-4 top-4 z-50 rounded-xl border px-4 py-3 text-sm shadow ${classes}`}>{message}</div>;
}

function PreviewModal({ row, onClose, onSaved, onNotify }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({
    customerName: row.customerName || row.fromEntityName || "",
    address: row.address || row.deliveryAddress || "",
    notes: row.notes || row.note || "",
  });

  const canEdit = String(row.status || "").toLowerCase() === "pending";

  async function saveEdit() {
    try {
      setSaving(true);
      await apiFetch(`/orders/${row._id}`, {
        method: "PATCH",
        body: {
          customerName: draft.customerName,
          address: draft.address,
          notes: draft.notes,
        },
      });
      onNotify("success", "Secondary order updated.");
      setEditing(false);
      await onSaved();
    } catch (error) {
      onNotify("error", error?.message || "Failed to update order");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <div className="text-lg font-semibold">Secondary Request Preview</div>
          <div className="flex gap-2">
            {canEdit ? <button type="button" className="rounded border px-3 py-1 text-sm" onClick={() => setEditing((s) => !s)}>{editing ? "Cancel Edit" : "Edit"}</button> : null}
            <button type="button" className="rounded border px-3 py-1 text-sm" onClick={onClose}>Close</button>
          </div>
        </div>
        <div className="p-5 grid md:grid-cols-2 gap-3 text-sm">
          <Field label="Order No" value={row.orderNo || "-"} />
          <Field label="Status" value={toStatusLabel(row.status)} />
          <Field label="Source" value={row.sourceType || "-"} />
          <Field label="From" value={row.fromEntityName || row.customerName || "-"} />
          <Field label="To" value={row.toWarehouseName || row.toEntityName || row.distributorName || "-"} />
          <Field label="Territory" value={row.territory || row.territoryName || row.areaName || "-"} />
          {editing ? <EditableField label="Customer Name" value={draft.customerName} onChange={(v) => setDraft((s) => ({ ...s, customerName: v }))} /> : <Field label="Customer Name" value={draft.customerName || "-"} />}
          <Field label="Date/Time (read-only)" value={row.createdAt ? new Date(row.createdAt).toLocaleString() : "-"} />
          <div className="md:col-span-2">{editing ? <EditableField label="Address" value={draft.address} onChange={(v) => setDraft((s) => ({ ...s, address: v }))} /> : <Field label="Address" value={draft.address || "-"} />}</div>
          <div className="md:col-span-2">{editing ? <EditableField label="Notes" value={draft.notes} onChange={(v) => setDraft((s) => ({ ...s, notes: v }))} /> : <Field label="Notes" value={draft.notes || "-"} />}</div>
          {editing ? <div className="md:col-span-2"><button disabled={saving} className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white" onClick={saveEdit}>{saving ? "Saving..." : "Save"}</button></div> : null}
        </div>
        <div className="px-5 pb-5">
          <div className="rounded-xl border p-3">
            <div className="text-sm font-semibold">Proof of Delivery</div>
            {row.podUrl || row.proofOfDeliveryImageUrl ? (
              <div className="mt-2 grid gap-3 md:grid-cols-2 text-xs text-zinc-600">
                <img src={row.podUrl || row.proofOfDeliveryImageUrl} alt="Proof of delivery" className="w-full max-h-64 rounded border object-contain bg-zinc-50" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                <div className="space-y-2">
                  <div><span className="font-medium text-zinc-700">Uploaded At:</span> {row.podUploadedAt || row.proofOfDeliveryAt ? new Date(row.podUploadedAt || row.proofOfDeliveryAt).toLocaleString() : "-"}</div>
                  <div><span className="font-medium text-zinc-700">Uploaded By:</span> {podUploaderName(row)}</div>
                  <a className="text-blue-600 underline" href={row.podUrl || row.proofOfDeliveryImageUrl} target="_blank" rel="noreferrer">Open Image</a>
                </div>
              </div>
            ) : (
              <div className="mt-2 text-xs text-zinc-500">No proof of delivery uploaded yet.</div>
            )}
          </div>
          <div className="mt-4 rounded-xl border p-3">
            <div className="text-sm font-semibold">Product Detail</div>
            <div className="mt-2 overflow-x-auto rounded border">
              <table className="min-w-full text-xs">
                <thead className="bg-zinc-50"><tr><th className="p-2 text-left">S.No</th><th className="p-2 text-left">Section</th><th className="p-2 text-left">Product</th><th className="p-2 text-left">Qty</th><th className="p-2 text-left">Rate</th><th className="p-2 text-left">TO</th><th className="p-2 text-left">Disc</th><th className="p-2 text-left">Extra</th><th className="p-2 text-left">Bons</th><th className="p-2 text-left">GST%</th></tr></thead>
                <tbody>
                  {(row.items || row.orderItems || []).map((item, idx) => {
                    const notes = parseNoteMap(item.notes || item.note || "");
                    return (
                      <tr key={`${idx}-${item.productId || item.productCode || item.productName || "item"}`} className="border-b">
                        <td className="p-2">{idx + 1}</td>
                        <td className="p-2">{item.section || row.saleType || "secondary"}</td>
                        <td className="p-2">{item.productName || item.name || item.productCode || "-"}</td>
                        <td className="p-2">{item.quantity || item.totalPacks || item.qty || 0}</td>
                        <td className="p-2">{item.unitPrice || item.rate || 0}</td>
                        <td className="p-2">{notes.to || item.toValue || 0}</td>
                        <td className="p-2">{notes.disc || item.discValue || 0}</td>
                        <td className="p-2">{notes.extra || item.extraValue || 0}</td>
                        <td className="p-2">{notes.bons || item.bonsValue || 0}</td>
                        <td className="p-2">{item.gstPer || notes.gstPer || 0}</td>
                      </tr>
                    );
                  })}
                  {!(row.items || row.orderItems || []).length ? <tr><td className="p-2 text-center text-zinc-500" colSpan={10}>No products found.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }) { return <div><div className="text-zinc-500">{label}</div><div className="font-medium">{value}</div></div>; }
function EditableField({ label, value, onChange }) { return <label><div className="text-zinc-500">{label}</div><input className="mt-1 w-full rounded border px-3 py-2" value={value || ""} onChange={(e) => onChange(e.target.value)} /></label>; }
