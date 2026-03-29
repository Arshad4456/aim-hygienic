"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { apiFetch } from "../../../../lib/api";

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);
  return now;
}

export default function FinanceInvoicesPage() {
  const now = useNow();
  const [orders, setOrders] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    apiFetch("/orders?limit=2000")
      .then((ordersData) => {
        if (ignore) return;
        setOrders(ordersData.orders || []);
      })
      .catch((e) => {
        if (ignore) return;
        setErr(e.message || "Failed to load invoices");
      })
      .finally(() => {
        if (ignore) return;
        setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  const dispatchedDeliveredInvoices = useMemo(
    () => orders.filter((o) => ["dispatched", "delivered"].includes(String(o.status || "").toLowerCase())),
    [orders]
  );
  const primaryInvoices = useMemo(
    () => dispatchedDeliveredInvoices.filter((o) => String(o.saleType || "").toLowerCase() !== "secondary"),
    [dispatchedDeliveredInvoices]
  );
  const secondaryInvoices = useMemo(
    () => dispatchedDeliveredInvoices.filter((o) => String(o.saleType || "").toLowerCase() === "secondary"),
    [dispatchedDeliveredInvoices]
  );

  return (
    <AdminShell title="Invoices" user={null}>
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xl font-semibold text-zinc-900">Invoices</div>
            <div className="text-sm text-zinc-500 mt-1">All dispatched and delivered sales invoices from order management.</div>
          </div>
          <div className="rounded-full border bg-zinc-50 px-3 py-1 text-xs text-zinc-600">{now.toLocaleString()}</div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <StatCard label="Dispatched + Delivered Invoices" value={String(dispatchedDeliveredInvoices.length)} />
          <StatCard label="Dispatched + Delivered Amount" value={`PKR ${dispatchedDeliveredInvoices.reduce((s, o) => s + Number(o.totalAmount || 0), 0).toLocaleString()}`} />
          <StatCard label="Primary Invoices" value={String(primaryInvoices.length)} />
          <StatCard label="Secondary Invoices" value={String(secondaryInvoices.length)} />
        </div>

        {err ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div> : null}

        <div className="mt-5 space-y-5">
          <InvoiceTable title="Primary Order Invoices" rows={primaryInvoices} loading={loading} />
          <InvoiceTable title="Secondary Order Invoices" rows={secondaryInvoices} loading={loading} />
        </div>
      </div>
    </AdminShell>
  );
}


function InvoiceTable({ title, rows, loading }) {
  return (
    <div className="overflow-auto rounded-xl border">
      <div className="border-b bg-zinc-50 px-3 py-2 text-sm font-semibold">{title}</div>
      <table className="min-w-[1080px] w-full text-sm">
        <thead className="bg-zinc-50">
          <tr>
            {["Invoice/Order #", "Sale Type", "Distributor", "Territory", "Total Amount", "Delivered Date", "Status", "Action"].map((h) => (
              <th key={h} className="text-left px-3 py-2 border-b">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={8} className="px-3 py-6 text-center text-zinc-500">Loading delivered invoices...</td></tr>
          ) : rows.length === 0 ? (
            <tr><td colSpan={8} className="px-3 py-6 text-center text-zinc-500">No invoices found.</td></tr>
          ) : (
            rows.map((o) => (
              <tr key={o._id}>
                <td className="px-3 py-2 border-b font-medium text-zinc-900">{o.orderNo || o.invoiceNo || o._id}</td>
                <td className="px-3 py-2 border-b">{o.saleType || "-"}</td>
                <td className="px-3 py-2 border-b">{o.distributorName || o.customerName || o.distributorId || "-"}</td>
                <td className="px-3 py-2 border-b">{o.territoryName || o.areaName || "-"}</td>
                <td className="px-3 py-2 border-b">PKR {Number(o.totalAmount || 0).toLocaleString()}</td>
                <td className="px-3 py-2 border-b">{o.updatedAt ? new Date(o.updatedAt).toLocaleDateString() : "-"}</td>
                <td className="px-3 py-2 border-b"><span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700">{String(o.status || "delivered").replaceAll("_", " ")}</span></td>
                <td className="px-3 py-2 border-b"><button type="button" onClick={() => printOrderInvoice(o)} className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100">Invoice</button></td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function printOrderInvoice(order) {
  const popup = window.open("", "_blank", "width=950,height=700");
  if (!popup) {
    alert("Please allow popups to print invoice.");
    return;
  }

  const itemRows = (order.items || [])
    .map((item, idx) => {
      const qty = Number(item.totalPacks || item.quantity || 0);
      const rate = Number(item.onePackPrice || item.unitPrice || 0);
      const gross = qty * rate;
      return `<tr><td>${idx + 1}</td><td>${escapeHtml(item.productName || "-")}</td><td>${qty}</td><td>${rate.toFixed(2)}</td><td>${gross.toFixed(2)}</td></tr>`;
    })
    .join("");

  const html = `
    <html><body style="font-family:Arial,sans-serif;padding:16px;color:#111;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:54px;height:54px;border-radius:10px;background:linear-gradient(135deg,#065f46,#10b981);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:22px;">AH</div>
          <div>
            <div style="font-weight:700;font-size:18px;">AIM Hygienic (Pvt) Limited</div>
            <div style="font-size:11px;color:#555;">Sales Invoice</div>
          </div>
        </div>
        <div style="font-size:12px;text-align:right;">
          <div><b>Invoice #:</b> ${escapeHtml(order.orderNo || order.invoiceNo || order._id || "-")}</div>
          <div><b>Date:</b> ${order.updatedAt ? new Date(order.updatedAt).toLocaleDateString() : "-"}</div>
        </div>
      </div>

      <div style="margin-top:10px;font-size:12px;"><b>Invoice From:</b> ${escapeHtml(order.toWarehouseName || order.fromEntityName || "AIM Hygienic")}</div>
      <div style="font-size:12px;"><b>Bill To:</b> ${escapeHtml(order.distributorName || order.customerName || order.distributorId || "-")}</div>
      <div style="font-size:12px;"><b>Territory:</b> ${escapeHtml(order.territoryName || order.areaName || "-")}</div>

      <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;margin-top:12px;font-size:12px;">
        <thead><tr><th>#</th><th>Product</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
        <tbody>${itemRows || '<tr><td colspan="5">No item details available</td></tr>'}</tbody>
      </table>

      <div style="margin-top:12px;display:flex;justify-content:flex-end;font-size:12px;">
        <div style="min-width:260px;">
          <div style="display:flex;justify-content:space-between;"><span>Total Amount:</span><strong>${Number(order.totalAmount || 0).toFixed(2)}</strong></div>
        </div>
      </div>

      <div style="margin-top:16px;text-align:center;font-size:12px;">Thank you for business with AIM Hygienic (Pvt) Limited.</div>
    </body></html>`;

  popup.document.write(html);
  popup.document.close();
  popup.print();
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function StatCard({ label, value }) {
  return <div className="rounded-xl border p-3"><div className="text-xs text-zinc-500">{label}</div><div className="mt-1 text-lg font-semibold text-zinc-900">{value}</div></div>;
}
