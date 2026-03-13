"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { apiFetch } from "../../../../lib/api";

const statusClasses = {
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  rejected: "border-rose-200 bg-rose-50 text-rose-700",
};

export default function FinanceReceiptsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ status: "all", paymentMethod: "all", fromDate: "", toDate: "" });
  const [rejecting, setRejecting] = useState(null);
  const [receiptView, setReceiptView] = useState(null);
  const [reason, setReason] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const q = new URLSearchParams();
      if (filters.status !== "all") q.set("status", filters.status);
      if (filters.paymentMethod !== "all") q.set("paymentMethod", filters.paymentMethod);
      if (filters.fromDate) q.set("fromDate", filters.fromDate);
      if (filters.toDate) q.set("toDate", filters.toDate);
      const data = await apiFetch(`/receipts?${q.toString()}`);
      setRows(data.receipts || []);
    } catch (e) {
      setError(e.message || "Failed to load receipts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.status, filters.paymentMethod, filters.fromDate, filters.toDate]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.total += Number(r.amount || 0);
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
      },
      { total: 0, pending: 0, approved: 0, rejected: 0 },
    );
  }, [rows]);

  async function approve(id) {
    try {
      await apiFetch(`/receipts/${id}/approve`, { method: "POST" });
      await load();
    } catch (e) {
      alert(e.message || "Failed to approve receipt");
    }
  }

  async function reject() {
    if (!rejecting) return;
    try {
      await apiFetch(`/receipts/${rejecting._id}/reject`, { method: "POST", body: { reason } });
      setRejecting(null);
      setReason("");
      await load();
    } catch (e) {
      alert(e.message || "Failed to reject receipt");
    }
  }

  return (
    <AdminShell title="Receipts" user={null}>
      <div className="space-y-4 rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-zinc-900">Receipts (Central Approval Queue)</h1>
            <p className="mt-1 text-sm text-zinc-500">Only approved receipts are posted to account balances and invoice settlement.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Card label="Total Amount" value={`PKR ${totals.total.toLocaleString()}`} />
          <Card label="Pending" value={String(totals.pending)} />
          <Card label="Approved" value={String(totals.approved)} />
          <Card label="Rejected" value={String(totals.rejected)} />
        </div>

        <div className="grid grid-cols-1 gap-3 rounded-xl border bg-zinc-50 p-3 md:grid-cols-5">
          <Select label="Status" value={filters.status} onChange={(v) => setFilters((s) => ({ ...s, status: v }))} options={["pending", "approved", "rejected", "all"]} />
          <Select label="Payment Method" value={filters.paymentMethod} onChange={(v) => setFilters((s) => ({ ...s, paymentMethod: v }))} options={["all", "online", "cash"]} />
          <Input label="From Date" type="date" value={filters.fromDate} onChange={(v) => setFilters((s) => ({ ...s, fromDate: v }))} />
          <Input label="To Date" type="date" value={filters.toDate} onChange={(v) => setFilters((s) => ({ ...s, toDate: v }))} />
          <div className="flex items-end"><button onClick={() => setFilters({ status: "pending", paymentMethod: "all", fromDate: "", toDate: "" })} className="w-full rounded-lg border bg-white px-3 py-2 text-sm">Reset</button></div>
        </div>

        {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

        <div className="overflow-auto rounded-xl border">
          <table className="min-w-[1320px] w-full text-sm">
            <thead className="bg-zinc-50">
              <tr>
                {["Receipt No", "Payer Role", "Payer Name", "Amount", "Payment", "Paid To", "Payment Date", "Reference", "Linked Invoice", "Status", "Created At", "Actions"].map((h) => (
                  <th key={h} className="border-b px-3 py-2 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="px-3 py-6 text-center text-zinc-500" colSpan={12}>Loading receipts...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td className="px-3 py-6 text-center text-zinc-500" colSpan={12}>No receipts found.</td></tr>
              ) : rows.map((r) => (
                <tr key={r._id}>
                  <td className="border-b px-3 py-2 font-medium">{r.receiptNo || "-"}</td>
                  <td className="border-b px-3 py-2">{r.payerRole || "-"}</td>
                  <td className="border-b px-3 py-2">{r.payerName || "-"}</td>
                  <td className="border-b px-3 py-2">PKR {Number(r.amount || 0).toLocaleString()}</td>
                  <td className="border-b px-3 py-2">{String(r.paymentMethod || "-").toUpperCase()}</td>
                  <td className="border-b px-3 py-2">{r.paymentMethod === "online" ? (r.paidToAccountId?.accountName || "-") : (r.receivedByUserId?.fullName || r.receivedByName || "-")}</td>
                  <td className="border-b px-3 py-2">{r.paymentDate ? new Date(r.paymentDate).toLocaleDateString() : "-"}</td>
                  <td className="border-b px-3 py-2">{r.referenceNo || "-"}</td>
                  <td className="border-b px-3 py-2">{r.linkedInvoiceNo || "-"}</td>
                  <td className="border-b px-3 py-2"><span className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${statusClasses[r.status] || "border-zinc-200 bg-zinc-50 text-zinc-700"}`}>{r.status || "pending"}</span></td>
                  <td className="border-b px-3 py-2">{r.createdAt ? new Date(r.createdAt).toLocaleString() : "-"}</td>
                  <td className="border-b px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => setReceiptView(r)} className="rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700">View Receipt</button>
                      <button onClick={() => openRuntimeReceiptPreview(r)} className="rounded-lg border border-violet-200 bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-700">Template Preview</button>
                      {r.attachmentUrl ? <a target="_blank" rel="noreferrer" href={r.attachmentUrl} className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-xs font-semibold">URL</a> : null}
                      {r.status === "pending" ? <button onClick={() => approve(r._id)} className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">Approve</button> : null}
                      {r.status === "pending" ? <button onClick={() => setRejecting(r)} className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700">Reject</button> : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {receiptView ? <ReceiptPreview receipt={receiptView} onClose={() => setReceiptView(null)} /> : null}
      {rejecting ? (
        <Modal title={`Reject ${rejecting.receiptNo || "Receipt"}`} onClose={() => setRejecting(null)}>
          <label className="text-sm font-medium">Rejection Reason</label>
          <textarea className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" rows={4} value={reason} onChange={(e) => setReason(e.target.value)} />
          <div className="mt-3 flex justify-end gap-2">
            <button onClick={() => setRejecting(null)} className="rounded-lg border px-4 py-2 text-sm">Cancel</button>
            <button onClick={reject} className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white">Submit Reject</button>
          </div>
        </Modal>
      ) : null}
    </AdminShell>
  );
}


function openRuntimeReceiptPreview(receipt) {
  const id = receipt?._id;
  if (!id) return;
  window.open(`/runtime-documents/receipt/${id}`, "_blank", "width=1100,height=820");
}

function ReceiptPreview({ receipt, onClose }) {
  function print() {
    const popup = window.open("", "_blank", "width=900,height=720");
    if (!popup) return;
    popup.document.write(`
      <html><body style="font-family:Arial,sans-serif;padding:18px;color:#111;">
        <h2 style="margin:0">AIM Hygienic (Pvt) Limited</h2>
        <div style="font-size:12px;color:#555;margin-bottom:12px;">Payment Receipt (Admin Review Copy)</div>
        <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:12px;">
          <tr><td><b>Receipt No</b></td><td>${escapeHtml(receipt.receiptNo)}</td><td><b>Status</b></td><td>${escapeHtml(receipt.status)}</td></tr>
          <tr><td><b>Payer</b></td><td>${escapeHtml(receipt.payerName || "-")}</td><td><b>Payer Role</b></td><td>${escapeHtml(receipt.payerRole || "-")}</td></tr>
          <tr><td><b>Amount</b></td><td>PKR ${Number(receipt.amount || 0).toLocaleString()}</td><td><b>Payment Method</b></td><td>${escapeHtml(receipt.paymentMethod || "-")}</td></tr>
          <tr><td><b>Paid To</b></td><td colspan="3">${escapeHtml(receipt.paymentMethod === "online" ? (receipt.paidToAccountId?.accountName || "-") : (receipt.receivedByUserId?.fullName || receipt.receivedByName || "-"))}</td></tr>
          <tr><td><b>Payment Date</b></td><td>${receipt.paymentDate ? new Date(receipt.paymentDate).toLocaleDateString() : "-"}</td><td><b>Reference</b></td><td>${escapeHtml(receipt.referenceNo || "-")}</td></tr>
          <tr><td><b>Linked Invoice</b></td><td>${escapeHtml(receipt.linkedInvoiceNo || "-")}</td><td><b>Created At</b></td><td>${receipt.createdAt ? new Date(receipt.createdAt).toLocaleString() : "-"}</td></tr>
          <tr><td><b>Description / Notes</b></td><td colspan="3">${escapeHtml(receipt.notes || "-")}</td></tr>
        </table>
      </body></html>`);
    popup.document.close();
    popup.print();
  }

  return (
    <Modal title="Receipt Preview" onClose={onClose}>
      <div className="rounded-xl border bg-zinc-50 p-4 text-sm">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <KV k="Receipt No" v={receipt.receiptNo} /><KV k="Status" v={receipt.status} />
          <KV k="Payer" v={receipt.payerName} /><KV k="Role" v={receipt.payerRole} />
          <KV k="Amount" v={`PKR ${Number(receipt.amount || 0).toLocaleString()}`} /><KV k="Payment" v={receipt.paymentMethod} />
          <KV k="Paid To" v={receipt.paymentMethod === "online" ? (receipt.paidToAccountId?.accountName || "-") : (receipt.receivedByUserId?.fullName || receipt.receivedByName || "-")} />
          <KV k="Payment Date" v={receipt.paymentDate ? new Date(receipt.paymentDate).toLocaleDateString() : "-"} />
          <KV k="Reference" v={receipt.referenceNo || "-"} /><KV k="Linked Invoice" v={receipt.linkedInvoiceNo || "-"} />
        </div>
        <div className="mt-3 border-t pt-3"><div className="font-semibold">Description / Notes</div><div className="text-zinc-700">{receipt.notes || "-"}</div></div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="rounded-lg border px-4 py-2 text-sm">Close</button>
        <button onClick={() => openRuntimeReceiptPreview(receipt)} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white">Open Template Preview</button>
        <button onClick={print} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Print Receipt</button>
      </div>
    </Modal>
  );
}

function Modal({ title, children, onClose }) { return <div className="fixed inset-0 z-[70]"><div className="absolute inset-0 bg-black/40" onClick={onClose} /><div className="absolute left-1/2 top-1/2 w-[95vw] max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-5 shadow-2xl"><div className="mb-3 flex items-center justify-between"><div className="text-lg font-semibold">{title}</div><button onClick={onClose} className="rounded-md border px-2 py-1 text-sm">✕</button></div>{children}</div></div>; }
function Card({ label, value }) { return <div className="rounded-xl border p-3"><div className="text-xs text-zinc-500">{label}</div><div className="mt-1 text-lg font-semibold">{value}</div></div>; }
function Input({ label, type = "text", value, onChange }) { return <label className="block"><div className="text-xs font-medium text-zinc-600">{label}</div><input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm" /></label>; }
function Select({ label, value, onChange, options }) { return <label className="block"><div className="text-xs font-medium text-zinc-600">{label}</div><select value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm">{options.map((o) => <option key={o} value={o}>{o}</option>)}</select></label>; }
function KV({ k, v }) { return <div className="flex justify-between border-b py-1"><span className="text-zinc-600">{k}</span><span className="font-medium text-right">{v || "-"}</span></div>; }
function escapeHtml(value) { return String(value || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }