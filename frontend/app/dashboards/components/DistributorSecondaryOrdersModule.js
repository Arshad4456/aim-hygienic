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
    [orders]
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
          <thead><tr><th>#</th><th>Product</th><th>Qty</th><th>Rate</th></tr></thead>
          <tbody>
            ${(order.items || []).map((it, i) => `<tr><td>${i + 1}</td><td>${it.productName || "-"}</td><td>${it.quantity || 0}</td><td>${it.unitPrice || 0}</td></tr>`).join("") || '<tr><td colspan="4">No items</td></tr>'}
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
            <thead><tr className="border-b bg-zinc-50"><th className="p-2 text-left">Order No</th><th className="p-2 text-left">Source</th><th className="p-2 text-left">From</th><th className="p-2 text-left">To</th><th className="p-2 text-left">Date/Time</th><th className="p-2 text-left">Status</th><th className="p-2 text-left">Read/Unread</th><th className="p-2 text-left">Action</th></tr></thead>
            <tbody>
              {requestRows.map((row) => (
                <tr key={row._id} className={rowClass(row.status)}>
                  <td className="p-2">{row.orderNo || "-"}</td>
                  <td className="p-2">{row.sourceType || "-"}</td>
                  <td className="p-2">{row.fromEntityName || row.customerName || "-"}</td>
                  <td className="p-2">{row.toWarehouseName || "-"}</td>
                  <td className="p-2">{row.createdAt ? new Date(row.createdAt).toLocaleString() : "-"}</td>
                  <td className="p-2">{toStatusLabel(row.status)}</td>
                  <td className="p-2">{row.unreadForDistributor ? "Unread" : "Read"}</td>
                  <td className="p-2"><div className="flex flex-wrap gap-2"><button className="rounded border px-2 py-1" onClick={() => openRequest(row._id)}>Open</button><button className="rounded border px-2 py-1" onClick={() => setPreviewRow(row)}>Preview</button><button className="rounded border border-red-300 px-2 py-1 text-red-700" onClick={() => updateStatus(row._id, "rejected")}>Reject</button><button className="rounded border border-blue-300 px-2 py-1 text-blue-700" onClick={() => updateStatus(row._id, "approved")}>Approve</button><button className="rounded border border-indigo-300 px-2 py-1 text-indigo-700" onClick={() => updateStatus(row._id, "dispatched")}>Dispatched</button><button className="rounded border border-emerald-400 px-2 py-1 text-emerald-700" onClick={() => updateStatus(row._id, "delivered")}>Delivered</button></div></td>
                </tr>
              ))}
              {!requestRows.length ? <tr><td colSpan={8} className="p-4 text-center text-zinc-500">{loading ? "Loading..." : "No secondary order requests."}</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold">Secondary Orders Ledger</h3>
        <div className="overflow-x-auto mt-3 rounded border">
          <table className="min-w-full text-sm">
            <thead><tr className="border-b bg-zinc-50"><th className="p-2 text-left">Order No</th><th className="p-2 text-left">Source</th><th className="p-2 text-left">From</th><th className="p-2 text-left">To</th><th className="p-2 text-left">Date/Time</th><th className="p-2 text-left">Action</th></tr></thead>
            <tbody>
              {ledgerRows.map((row) => (
                <tr key={row._id} className={rowClass(row.status)}>
                  <td className="p-2">{row.orderNo || "-"}</td>
                  <td className="p-2">{row.sourceType || "-"}</td>
                  <td className="p-2">{row.fromEntityName || row.customerName || "-"}</td>
                  <td className="p-2">{row.toWarehouseName || "-"}</td>
                  <td className="p-2">{row.createdAt ? new Date(row.createdAt).toLocaleString() : "-"}</td>
                  <td className="p-2"><div className="flex gap-2"><button className="rounded border px-2 py-1" onClick={() => printInvoice(row)}>Invoice/Receipt</button><button className="rounded border border-red-300 px-2 py-1 text-red-700" onClick={() => deleteOrder(row._id)}>Delete</button></div></td>
                </tr>
              ))}
              {!ledgerRows.length ? <tr><td colSpan={6} className="p-4 text-center text-zinc-500">{loading ? "Loading..." : "No secondary order ledger records."}</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      {previewRow ? <PreviewModal row={previewRow} onClose={() => setPreviewRow(null)} /> : null}
    </div>
  );
}

function InlineToast({ type, message }) {
  const classes = type === "success" ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-red-300 bg-red-50 text-red-700";
  return <div className={`fixed right-4 top-4 z-50 rounded-xl border px-4 py-3 text-sm shadow ${classes}`}>{message}</div>;
}

function PreviewModal({ row, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-3">
          <div className="text-lg font-semibold">Secondary Request Preview</div>
          <button type="button" className="rounded border px-3 py-1 text-sm" onClick={onClose}>Close</button>
        </div>
        <div className="p-5 grid md:grid-cols-2 gap-3 text-sm">
          <Field label="Order No" value={row.orderNo || "-"} />
          <Field label="Status" value={toStatusLabel(row.status)} />
          <Field label="Source" value={row.sourceType || "-"} />
          <Field label="From" value={row.fromEntityName || row.customerName || "-"} />
          <Field label="To" value={row.toWarehouseName || "-"} />
          <Field label="Date/Time" value={row.createdAt ? new Date(row.createdAt).toLocaleString() : "-"} />
        </div>
        <div className="px-5 pb-5">
          <div className="rounded-xl border p-3">
            <div className="text-sm font-semibold">Proof of Delivery</div>
            {row.podUrl || row.proofOfDeliveryImageUrl ? (
              <div className="mt-2 grid gap-3 md:grid-cols-2 text-xs text-zinc-600">
                <img src={row.podUrl || row.proofOfDeliveryImageUrl} alt="Proof of delivery" className="w-full max-h-64 rounded border object-contain bg-zinc-50" />
                <div className="space-y-2">
                  <div><span className="font-medium text-zinc-700">Uploaded At:</span> {row.podUploadedAt || row.proofOfDeliveryAt ? new Date(row.podUploadedAt || row.proofOfDeliveryAt).toLocaleString() : "-"}</div>
                  <div><span className="font-medium text-zinc-700">Uploaded By:</span> {row.podUploadedBy || row.proofOfDeliveryBy || "-"}</div>
                </div>
              </div>
            ) : (
              <div className="mt-2 text-xs text-zinc-500">POD not uploaded yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return <div><div className="text-zinc-500">{label}</div><div className="font-medium">{value}</div></div>;
}