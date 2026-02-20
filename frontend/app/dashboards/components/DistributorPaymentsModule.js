"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/api";

function formatCurrency(value) {
  const n = Number(value || 0);
  return `Rs ${n.toLocaleString()}`;
}

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-GB");
}

function deadlineLabel(status, days, remaining) {
  if (Number(remaining || 0) <= 0) return { text: "Settled", className: "bg-emerald-100 text-emerald-700" };
  if (status === "overdue") return { text: "Overdue", className: "bg-red-100 text-red-700" };
  if (status === "due_soon") return { text: `Due in ${days} day${Number(days) === 1 ? "" : "s"}`, className: "bg-amber-100 text-amber-700" };
  return { text: "On Track", className: "bg-blue-100 text-blue-700" };
}

export default function DistributorPaymentsModule({ mode = "primary" }) {
  const [primaryRows, setPrimaryRows] = useState([]);
  const [secondaryRows, setSecondaryRows] = useState([]);
  const [invoiceDetail, setInvoiceDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [warehouseId, setWarehouseId] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState("all");

  const warehouseOptions = useMemo(() => {
    const source = mode === "primary" ? primaryRows : secondaryRows;
    const seen = new Map();
    source.forEach((row) => {
      const id = String(row.warehouseId || "");
      if (!id || seen.has(id)) return;
      seen.set(id, row.warehouseName || "Warehouse");
    });
    return Array.from(seen.entries()).map(([value, label]) => ({ value, label }));
  }, [mode, primaryRows, secondaryRows]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const q = new URLSearchParams();
      if (warehouseId !== "all") q.set("warehouse_id", warehouseId);
      if (startDate) q.set("start_date", startDate);
      if (endDate) q.set("end_date", endDate);
      if (mode === "primary") {
        q.set("status", status);
        const data = await apiFetch(`/payments/primary?${q.toString()}`);
        setPrimaryRows(data.primaryPayments || []);
      } else {
        const data = await apiFetch(`/payments/secondary?${q.toString()}`);
        setSecondaryRows(data.secondaryPayments || []);
      }
    } catch (error) {
      setErr(error?.message || "Failed to load payments");
    } finally {
      setLoading(false);
    }
  }, [endDate, mode, startDate, status, warehouseId]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = useMemo(() => {
    const totalReceived = primaryRows.reduce((acc, row) => acc + Number(row.amountTotal || 0), 0);
    const totalPaidBack = primaryRows.reduce((acc, row) => acc + Number(row.amountPaidBack || 0), 0);
    const totalRemaining = primaryRows.reduce((acc, row) => acc + Number(row.amountRemaining || 0), 0);
    const overdue = primaryRows.filter((row) => row.deadlineStatus === "overdue" && Number(row.amountRemaining || 0) > 0).length;
    const dueSoon = primaryRows.filter((row) => row.deadlineStatus === "due_soon" && Number(row.amountRemaining || 0) > 0).length;
    return { totalReceived, totalPaidBack, totalRemaining, overdue, dueSoon };
  }, [primaryRows]);

  async function openInvoice(invoiceNo) {
    try {
      const data = await apiFetch(`/payments/primary/${invoiceNo}`);
      setInvoiceDetail(data);
    } catch (error) {
      setErr(error?.message || "Failed to load invoice");
    }
  }

  return (
    <div className="space-y-4 mt-6">
      {err ? <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div> : null}

      {mode === "primary" ? (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <Card label="Total Received" value={formatCurrency(totals.totalReceived)} />
            <Card label="Total Paid Back" value={formatCurrency(totals.totalPaidBack)} />
            <Card label="Total Remaining" value={formatCurrency(totals.totalRemaining)} />
          </div>
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            You have {totals.overdue} overdue invoice(s) and {totals.dueSoon} due soon invoice(s).
          </div>
        </>
      ) : null}

      <div className="rounded-xl border bg-white p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <label className="text-sm">Warehouse
            <select className="mt-1 w-full rounded border px-2 py-2" value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
              <option value="all">All</option>
              {warehouseOptions.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
            </select>
          </label>
          <label className="text-sm">From Date
            <input type="date" className="mt-1 w-full rounded border px-2 py-2" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </label>
          <label className="text-sm">To Date
            <input type="date" className="mt-1 w-full rounded border px-2 py-2" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </label>
          {mode === "primary" ? (
            <label className="text-sm">Status
              <select className="mt-1 w-full rounded border px-2 py-2" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="all">All</option>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </select>
            </label>
          ) : <div className="flex items-end"><button type="button" className="rounded border px-3 py-2 text-sm" onClick={() => load()}>Refresh</button></div>}
        </div>
      </div>

      {mode === "primary" ? (
        <div className="overflow-auto rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50"><tr>
              <th className="border-b p-2 text-left">Invoice-No</th><th className="border-b p-2 text-left">Warehouse Name</th><th className="border-b p-2 text-left">Amount Total</th><th className="border-b p-2 text-left">Paid Back</th><th className="border-b p-2 text-left">Remaining</th><th className="border-b p-2 text-left">Pay Date</th><th className="border-b p-2 text-left">Return Date</th><th className="border-b p-2 text-left">Deadline</th><th className="border-b p-2 text-left">Action</th>
            </tr></thead>
            <tbody>
              {primaryRows.map((row) => {
                const badge = deadlineLabel(row.deadlineStatus, row.daysToDeadline, row.amountRemaining);
                return <tr key={row._id}><td className="border-b p-2">{row.invoiceNo}</td><td className="border-b p-2">{row.warehouseName || "-"}</td><td className="border-b p-2">{formatCurrency(row.amountTotal)}</td><td className="border-b p-2">{formatCurrency(row.amountPaidBack)}</td><td className="border-b p-2">{formatCurrency(row.amountRemaining)}</td><td className="border-b p-2">{formatDate(row.payDate)}</td><td className="border-b p-2">{formatDate(row.returnDate)}</td><td className="border-b p-2"><span className={`rounded-full px-2 py-1 text-xs ${badge.className}`}>{badge.text}</span></td><td className="border-b p-2"><button type="button" className="rounded border px-2 py-1" onClick={() => openInvoice(row.invoiceNo)}>View Invoice/Receipt</button></td></tr>;
              })}
              {!primaryRows.length ? <tr><td colSpan={9} className="p-4 text-center text-zinc-500">{loading ? "Loading..." : "No primary payments found."}</td></tr> : null}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-auto rounded-xl border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50"><tr>
              <th className="border-b p-2 text-left">Primary Invoice-No</th><th className="border-b p-2 text-left">Warehouse Name</th><th className="border-b p-2 text-left">Paid Amount</th><th className="border-b p-2 text-left">Paid Date</th><th className="border-b p-2 text-left">Detail</th><th className="border-b p-2 text-left">Action</th>
            </tr></thead>
            <tbody>
              {secondaryRows.map((row) => <tr key={row._id}><td className="border-b p-2">{row.primaryInvoiceNo}</td><td className="border-b p-2">{row.warehouseName || "-"}</td><td className="border-b p-2">{formatCurrency(row.amountPaid)}</td><td className="border-b p-2">{formatDate(row.paidDate)}</td><td className="border-b p-2">{row.details || "-"}</td><td className="border-b p-2"><button type="button" className="rounded border px-2 py-1" onClick={() => openInvoice(row.primaryInvoiceNo)}>View Receipt</button></td></tr>)}
              {!secondaryRows.length ? <tr><td colSpan={6} className="p-4 text-center text-zinc-500">{loading ? "Loading..." : "No secondary payments found."}</td></tr> : null}
            </tbody>
          </table>
        </div>
      )}

      {invoiceDetail?.primaryPayment ? <InvoiceModal detail={invoiceDetail} onClose={() => setInvoiceDetail(null)} /> : null}
    </div>
  );
}

function Card({ label, value }) {
  return <div className="rounded-xl border bg-white p-4"><div className="text-sm text-zinc-500">{label}</div><div className="text-xl font-semibold">{value}</div></div>;
}

function InvoiceModal({ detail, onClose }) {
  const p = detail.primaryPayment || {};
  const paid = Number(p.amountPaidBack || 0);
  const remaining = Number(p.amountRemaining || 0);
  const status = p.deadlineStatus;
  const days = p.daysToDeadline;
  const banner = remaining <= 0
    ? "Invoice settled."
    : status === "overdue"
      ? `Payment overdue since ${formatDate(p.returnDate)}. Remaining: ${formatCurrency(remaining)}`
      : status === "due_soon"
        ? `Payment due on ${formatDate(p.returnDate)} (in ${days} day${Number(days) === 1 ? "" : "s"}). Remaining: ${formatCurrency(remaining)}`
        : `On track. Payment deadline is ${formatDate(p.returnDate)}. Remaining: ${formatCurrency(remaining)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-4xl rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-4 py-3"><div className="text-lg font-semibold">Invoice Detail</div><button type="button" className="rounded border px-3 py-1" onClick={onClose}>Close</button></div>
        <div className="p-4 space-y-3 text-sm">
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-amber-800">{banner}</div>
          <div className="grid gap-2 md:grid-cols-3">
            <Field label="Invoice No" value={p.invoiceNo} /><Field label="Warehouse" value={p.warehouseName} /><Field label="Distributor" value={p.distributorName} />
            <Field label="Amount Total" value={formatCurrency(p.amountTotal)} /><Field label="Pay Date" value={formatDate(p.payDate)} /><Field label="Return Date" value={formatDate(p.returnDate)} />
            <Field label="Paid Back" value={formatCurrency(paid)} /><Field label="Remaining" value={formatCurrency(remaining)} /><Field label="Details" value={p.details || "-"} />
          </div>
          <div className="rounded border">
            <table className="w-full text-sm"><thead className="bg-zinc-50"><tr><th className="border-b p-2 text-left">Paid Amount</th><th className="border-b p-2 text-left">Paid Date</th><th className="border-b p-2 text-left">Detail</th></tr></thead><tbody>{(detail.settlements || []).map((row) => <tr key={row._id}><td className="border-b p-2">{formatCurrency(row.amountPaid)}</td><td className="border-b p-2">{formatDate(row.paidDate)}</td><td className="border-b p-2">{row.details || "-"}</td></tr>)}{!(detail.settlements || []).length ? <tr><td colSpan={3} className="p-3 text-center text-zinc-500">No settlement records.</td></tr> : null}</tbody></table>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return <div><div className="text-zinc-500">{label}</div><div className="font-medium">{value || "-"}</div></div>;
}
