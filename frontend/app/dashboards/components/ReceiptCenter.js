"use client";

import { useEffect, useMemo, useState } from "react";
import UserDashboardShell from "./userDashboardShell";
import { apiFetch } from "../../lib/api";

export default function ReceiptCenter({ title, subtitle, roleKey, links = [] }) {
  const [form, setForm] = useState({ receiptType: "invoice_payment", amount: "", paymentMethod: "online", paidToAccountId: "", receivedByUserId: "", receivedByName: "", paymentDate: "", referenceNo: "", linkedInvoiceNo: "", notes: "", attachmentUrl: "" });
  const [uploading, setUploading] = useState(false);
  const [rows, setRows] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [collectors, setCollectors] = useState([]);
  const [invoices, setInvoices] = useState([]);

  async function load() {
    const [r, a, u, o] = await Promise.all([
      apiFetch("/receipts"),
      apiFetch("/accounts"),
      apiFetch("/users"),
      apiFetch("/orders?limit=300"),
    ]);
    setRows(r.receipts || []);
    setAccounts((a.accounts || []).filter((x) => String(x.status || "active") === "active"));
    setCollectors((u.users || []).filter((x) => ["salesman", "cashier", "order booker", "orderbooker"].includes(String(x.role || "").toLowerCase())));
    setInvoices((o.orders || []).filter((x) => ["approved", "dispatched", "delivered"].includes(String(x.status || "").toLowerCase())));
  }

  useEffect(() => {
    let ignore = false;
    Promise.all([apiFetch("/receipts"), apiFetch("/accounts"), apiFetch("/users"), apiFetch("/orders?limit=300")])
      .then(([r, a, u, o]) => {
        if (ignore) return;
        setRows(r.receipts || []);
        setAccounts((a.accounts || []).filter((x) => String(x.status || "active") === "active"));
        setCollectors((u.users || []).filter((x) => ["salesman", "cashier", "order booker", "orderbooker"].includes(String(x.role || "").toLowerCase())));
        setInvoices((o.orders || []).filter((x) => ["approved", "dispatched", "delivered"].includes(String(x.status || "").toLowerCase())));
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, []);

  const total = useMemo(() => rows.reduce((s, r) => s + Number(r.amount || 0), 0), [rows]);

  async function handleFileUpload(file) {
    if (!file) return;
    try {
      setUploading(true);
      const reader = new FileReader();
      const base64 = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const up = await apiFetch("/uploads/payment-proof", {
        method: "POST",
        body: { contentType: file.type || "image/jpeg", fileBase64: base64 },
      });
      setForm((s) => ({ ...s, attachmentUrl: up.publicUrl || "" }));
    } catch (e) {
      alert(e.message || "Failed to upload attachment");
    } finally {
      setUploading(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    const payload = {
      receiptType: form.receiptType,
      amount: Number(form.amount || 0),
      paymentMethod: form.paymentMethod,
      paidToAccountId: form.paymentMethod === "online" ? form.paidToAccountId : undefined,
      receivedByUserId: form.paymentMethod === "cash" ? form.receivedByUserId : undefined,
      receivedByName: form.paymentMethod === "cash" ? form.receivedByName : undefined,
      paymentDate: form.paymentDate,
      referenceNo: form.referenceNo,
      linkedInvoiceNo: form.linkedInvoiceNo,
      notes: form.notes,
      attachmentUrl: form.attachmentUrl,
    };
    await apiFetch("/receipts", { method: "POST", body: payload });
    setForm((s) => ({ ...s, amount: "", paymentDate: "", referenceNo: "", linkedInvoiceNo: "", notes: "", attachmentUrl: "", receivedByName: "" }));
    await load();
  }

  return (
    <UserDashboardShell title={title} subtitle={subtitle} roleKey={roleKey} links={links} showAccountCards>
      <div className="space-y-4">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h1 className="text-xl font-semibold">Generate Receipt</h1>
          <p className="text-sm text-zinc-500">Receipt will remain pending until approved by admin.</p>
          <form onSubmit={submit} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <Select label="Receipt Type" value={form.receiptType} onChange={(v) => setForm((s) => ({ ...s, receiptType: v }))} options={[{ value: "invoice_payment", label: "Payment Against Invoice" }, { value: "advance_payment", label: "Advance Payment" }, { value: "general_deposit", label: "General Deposit" }]} />
            <Input label="Amount" type="number" required value={form.amount} onChange={(v) => setForm((s) => ({ ...s, amount: v }))} />
            <Select label="Payment Method" value={form.paymentMethod} onChange={(v) => setForm((s) => ({ ...s, paymentMethod: v }))} options={[{ value: "online", label: "Online (Bank Transfer)" }, { value: "cash", label: "Cash" }]} />
            {form.paymentMethod === "online" ? <Select label="Company Account" value={form.paidToAccountId} onChange={(v) => setForm((s) => ({ ...s, paidToAccountId: v }))} required options={[{ value: "", label: "Select Account" }, ...accounts.map((x) => ({ value: x._id, label: x.accountName || [x.bankName, x.accountNumber].filter(Boolean).join(" - ") || x._id }))]} /> : null}
            {form.paymentMethod === "cash" ? <Select label="Received By Person" value={form.receivedByUserId} onChange={(v) => setForm((s) => ({ ...s, receivedByUserId: v }))} options={[{ value: "", label: "Select Collector" }, ...collectors.map((x) => ({ value: x._id, label: `${x.fullName || x.username || x.mobile} (${x.role || ""})` }))]} /> : null}
            {form.paymentMethod === "cash" ? <Input label="Receiver Name (optional)" value={form.receivedByName} onChange={(v) => setForm((s) => ({ ...s, receivedByName: v }))} /> : null}
            <Input label="Payment Date" type="date" required value={form.paymentDate} onChange={(v) => setForm((s) => ({ ...s, paymentDate: v }))} />
            <Input label="Reference No" value={form.referenceNo} required={form.paymentMethod === "online"} onChange={(v) => setForm((s) => ({ ...s, referenceNo: v }))} />
            {form.receiptType === "invoice_payment" ? <Select label="Linked Invoice (optional)" value={form.linkedInvoiceNo} onChange={(v) => setForm((s) => ({ ...s, linkedInvoiceNo: v }))} options={[{ value: "", label: "Select Invoice" }, ...invoices.map((x) => ({ value: x.invoiceNo || x.orderNo || x._id, label: `${x.invoiceNo || x.orderNo} [${x.status || "-"}] (${x.saleType || "-"})` }))]} /> : <div />}
            <div className="md:col-span-2">
              <label className="block">
                <div className="text-sm font-medium">Attachment Proof {form.paymentMethod === "online" ? "*" : ""}</div>
                <input type="file" accept="image/*,.pdf" onChange={(e) => handleFileUpload(e.target.files?.[0])} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" />
              </label>
              <div className="mt-1 flex items-center gap-2 text-xs">
                {uploading ? <span className="text-indigo-600">Uploading proof...</span> : null}
                {form.attachmentUrl ? <a href={form.attachmentUrl} target="_blank" rel="noreferrer" className="text-emerald-700 underline">{form.attachmentUrl}</a> : <span className="text-zinc-500">No file uploaded</span>}
              </div>
            </div>
            <div className="md:col-span-3"><Input label="Notes" value={form.notes} onChange={(v) => setForm((s) => ({ ...s, notes: v }))} /></div>
            <div className="md:col-span-3"><button className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Submit Receipt</button></div>
          </form>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Card label="My Receipts" value={String(rows.length)} />
          <Card label="My Total" value={`PKR ${total.toLocaleString()}`} />
          <Card label="Pending" value={String(rows.filter((r) => r.status === "pending").length)} />
        </div>

        <div className="overflow-auto rounded-xl border bg-white">
          <table className="min-w-[1080px] w-full text-sm">
            <thead className="bg-zinc-50"><tr>{["Receipt No", "Amount", "Payment", "Paid To", "Date", "Linked Invoice", "Status", "Rejection Reason", "Action"].map((h) => <th key={h} className="border-b px-3 py-2 text-left">{h}</th>)}</tr></thead>
            <tbody>
              {rows.length === 0 ? <tr><td colSpan={9} className="px-3 py-6 text-center text-zinc-500">No receipts yet.</td></tr> : rows.map((r) => (
                <tr key={r._id}>
                  <td className="border-b px-3 py-2 font-medium">{r.receiptNo || "-"}</td>
                  <td className="border-b px-3 py-2">PKR {Number(r.amount || 0).toLocaleString()}</td>
                  <td className="border-b px-3 py-2">{r.paymentMethod || "-"}</td>
                  <td className="border-b px-3 py-2">{r.paymentMethod === "online" ? (r.paidToAccountId?.accountName || "-") : (r.receivedByName || "-")}</td>
                  <td className="border-b px-3 py-2">{r.paymentDate ? new Date(r.paymentDate).toLocaleDateString() : "-"}</td>
                  <td className="border-b px-3 py-2">{r.linkedInvoiceNo || "-"}</td>
                  <td className="border-b px-3 py-2">{r.status || "pending"}</td>
                  <td className="border-b px-3 py-2 text-rose-700">{r.rejectionReason || "-"}</td>
                  <td className="border-b px-3 py-2">{r.attachmentUrl ? <a href={r.attachmentUrl} target="_blank" rel="noreferrer" className="rounded-lg border px-2 py-1 text-xs">URL</a> : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </UserDashboardShell>
  );
}

function Input({ label, value, onChange, type = "text", required = false }) { return <div><div className="text-sm font-medium">{label}</div><input required={required} type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" /></div>; }
function Select({ label, value, onChange, options, required = false }) { return <div><div className="text-sm font-medium">{label}</div><select required={required} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm">{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>; }
function Card({ label, value }) { return <div className="rounded-xl border bg-white p-4"><div className="text-xs text-zinc-500">{label}</div><div className="text-lg font-semibold">{value}</div></div>; }