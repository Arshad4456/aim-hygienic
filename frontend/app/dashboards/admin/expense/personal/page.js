"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { apiFetch } from "../../../../lib/api";

const categories = [
  "Kitchen Expense",
  "Guest Expense",
  "Fuel Expense",
  "Rent Expense",
  "Legal Expense",
  "Utility Expense",
  "Delivery Expense",
  "Electricity Expense",
  "Mobile Expense",
  "Refreshment Expense",
  "Salary Expense",
  "Other",
];

export default function PersonalExpensePage() {
  const [rows, setRows] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [form, setForm] = useState({
    category: categories[0],
    expenseDate: "",
    amount: "",
    paymentMethod: "cash",
    fromAccountId: "",
    paidTo: "",
    description: "",
    attachmentUrl: "",
  });

  useEffect(() => {
    Promise.all([apiFetch("/expenses?section=personal"), apiFetch("/accounts")])
      .then(([expenseData, accountData]) => {
        setRows(expenseData.expenses || []);
        setAccounts(accountData.accounts || []);
      })
      .catch(() => {});
  }, []);

  async function submit(e) {
    e.preventDefault();
    const payload = {
      section: "personal",
      subType: (form.category || "other").toLowerCase().replace(/\s+/g, "_"),
      category: form.category,
      amount: Number(form.amount || 0),
      paymentMethod: form.paymentMethod,
      paymentMode: form.paymentMethod === "online" ? "bank_transfer" : form.paymentMethod,
      fromAccountId: form.fromAccountId,
      paidTo: form.paidTo,
      expenseDate: form.expenseDate,
      notes: form.description,
      description: form.description,
      attachmentUrl: form.attachmentUrl,
      status: "posted",
      title: `${form.category} expense`,
      expenseId: `PER-${Date.now()}`,
    };
    const r = await apiFetch("/expenses", { method: "POST", body: payload });
    setRows((s) => [r.expense, ...s]);
    setForm((s) => ({ ...s, amount: "", paidTo: "", description: "", attachmentUrl: "" }));
  }

  async function onDelete(id) {
    if (!confirm("Delete this personal expense record?")) return;
    await apiFetch(`/expenses/${id}`, { method: "DELETE" });
    setRows((s) => s.filter((row) => row._id !== id));
  }

  const filteredRows = useMemo(() => {
    const from = filterFrom ? new Date(`${filterFrom}T00:00:00`) : null;
    const to = filterTo ? new Date(`${filterTo}T23:59:59`) : null;

    return rows.filter((row) => {
      const date = new Date(row.expenseDate || row.createdAt);
      if (from && date < from) return false;
      if (to && date > to) return false;
      return true;
    });
  }, [rows, filterFrom, filterTo]);

  const monthRows = filteredRows.filter((r) => {
    const d = new Date(r.expenseDate || r.createdAt);
    const n = new Date();
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
  });

  const today = filteredRows.filter((r) => new Date(r.expenseDate || r.createdAt).toDateString() === new Date().toDateString());

  return (
    <AdminShell title="AIM – Personal Expense" user={null}>
      <div className="space-y-5">
        <div className="rounded-2xl border bg-white p-5">
          <h1 className="text-xl font-semibold">AIM – Personal Expense</h1>
          <p className="text-sm text-zinc-500">Structured internal expense tracking with category discipline, ledger, and monthly analysis.</p>
          <form onSubmit={submit} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <Select label="Expense Category" value={form.category} onChange={(v) => setForm((s) => ({ ...s, category: v }))} options={categories.map((c) => ({ value: c, label: c }))} />
            <Input label="Expense Date" type="date" value={form.expenseDate} onChange={(v) => setForm((s) => ({ ...s, expenseDate: v }))} required />
            <Input label="Amount (PKR)" type="number" value={form.amount} onChange={(v) => setForm((s) => ({ ...s, amount: v }))} required />
            <Select label="Payment Method" value={form.paymentMethod} onChange={(v) => setForm((s) => ({ ...s, paymentMethod: v }))} options={[{ value: "cash", label: "Cash" }, { value: "online", label: "Online (Bank Transfer)" }]} />
            <Select label="Paid From Account" value={form.fromAccountId} onChange={(v) => setForm((s) => ({ ...s, fromAccountId: v }))} options={[{ value: "", label: "Select account" }, ...accounts.map((a) => ({ value: a._id, label: `${a.accountName} (${a.accountType})` }))]} />
            <Input label="Vendor / Payee Name" value={form.paidTo} onChange={(v) => setForm((s) => ({ ...s, paidTo: v }))} />
            <div className="md:col-span-2"><Input label="Notes / Description" value={form.description} onChange={(v) => setForm((s) => ({ ...s, description: v }))} required /></div>
            <Input label="Attachment URL" value={form.attachmentUrl} onChange={(v) => setForm((s) => ({ ...s, attachmentUrl: v }))} />
            <div className="md:col-span-3"><button className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white">Save Personal Expense</button></div>
          </form>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Metric label="Today" value={money(today.reduce((s, r) => s + Number(r.amount || 0), 0))} />
          <Metric label="This Month" value={money(monthRows.reduce((s, r) => s + Number(r.amount || 0), 0))} />
          <Metric label="Transactions" value={String(monthRows.length)} />
        </div>

        <div className="rounded-2xl border bg-white p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Input label="From Date" type="date" value={filterFrom} onChange={setFilterFrom} />
            <Input label="To Date" type="date" value={filterTo} onChange={setFilterTo} />
            <div className="flex items-end">
              <button onClick={() => { setFilterFrom(""); setFilterTo(""); }} type="button" className="rounded-xl border px-4 py-2 text-sm hover:bg-zinc-50">Reset Filters</button>
            </div>
          </div>
        </div>

        <div className="overflow-auto rounded-xl border bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50">
              <tr>
                {["Date", "Category", "Amount", "Payment", "Account", "Notes", "Created By", "Attachment", "Actions"].map((c) => (
                  <th key={c} className="border-b px-3 py-2 text-left">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r) => (
                <tr key={r._id}>
                  <td className="border-b px-3 py-2">{fmtDate(r.expenseDate)}</td>
                  <td className="border-b px-3 py-2">{r.category || "-"}</td>
                  <td className="border-b px-3 py-2">{money(r.amount)}</td>
                  <td className="border-b px-3 py-2">{r.paymentMethod || "-"}</td>
                  <td className="border-b px-3 py-2">{accountName(accounts, r.fromAccountId)}</td>
                  <td className="border-b px-3 py-2">{r.description || r.notes || "-"}</td>
                  <td className="border-b px-3 py-2">{r.requestedBy || "System"}</td>
                  <td className="border-b px-3 py-2">{r.attachmentUrl ? <a href={r.attachmentUrl} target="_blank" rel="noreferrer" className="text-indigo-600 underline">View</a> : "-"}</td>
                  <td className="border-b px-3 py-2">
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setSelectedReceipt(r)} className="rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100">Receipt</button>
                      <button type="button" onClick={() => onDelete(r._id)} className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRows.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-center text-zinc-500" colSpan={9}>No entries</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {selectedReceipt ? (
        <Modal title="AIM Hygienic Expense Receipt" onClose={() => setSelectedReceipt(null)}>
          <div className="rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 p-4">
            <div className="mb-3 flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-600 text-lg font-bold text-white">AH</div>
                <div>
                  <div className="text-lg font-bold">AIM Hygienic (Pvt) Limited</div>
                  <div className="text-xs text-zinc-500">Expense Payment Receipt</div>
                </div>
              </div>
              <div className="text-right text-xs text-zinc-600">
                <div><b>Receipt #:</b> {selectedReceipt.expenseId || selectedReceipt._id}</div>
                <div><b>Generated:</b> {new Date().toLocaleString()}</div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
              <ReceiptRow label="Expense Date" value={fmtDate(selectedReceipt.expenseDate)} />
              <ReceiptRow label="Category" value={selectedReceipt.category || "-"} />
              <ReceiptRow label="Amount" value={money(selectedReceipt.amount)} />
              <ReceiptRow label="Payment Method" value={(selectedReceipt.paymentMethod || "-").toUpperCase()} />
              <ReceiptRow label="Paid From Account" value={accountName(accounts, selectedReceipt.fromAccountId)} />
              <ReceiptRow label="Paid To" value={selectedReceipt.paidTo || selectedReceipt.vendorName || "-"} />
              <ReceiptRow label="Reference" value={selectedReceipt.paymentReference || "-"} />
              <ReceiptRow label="Status" value={selectedReceipt.status || "-"} />
              <ReceiptRow label="Created At" value={fmtDateTime(selectedReceipt.createdAt)} />
              <ReceiptRow label="Created By" value={selectedReceipt.requestedBy || "System"} />
            </div>
            <div className="mt-3 border-t pt-3 text-sm">
              <div className="mb-1 font-semibold">Description / Notes</div>
              <div className="text-zinc-700">{selectedReceipt.description || selectedReceipt.notes || "-"}</div>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => printPersonalReceipt(selectedReceipt, accountName(accounts, selectedReceipt.fromAccountId))}
              className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-indigo-700"
            >
              Print Receipt
            </button>
            <button type="button" onClick={() => setSelectedReceipt(null)} className="rounded-lg border px-4 py-2">Close</button>
          </div>
        </Modal>
      ) : null}
    </AdminShell>
  );
}

function printPersonalReceipt(expense, accountLabel) {
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) return;
  const html = `<!doctype html>
<html>
<head><title>Expense Receipt</title></head>
<body style="font-family:Arial,sans-serif;background:#f3f4f6;padding:20px;">
  <div style="max-width:760px;margin:0 auto;background:#fff;border:1px solid #d4d4d8;border-radius:12px;padding:18px;">
    <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e4e4e7;padding-bottom:12px;">
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="width:50px;height:50px;border-radius:10px;background:#059669;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:18px;">AH</div>
        <div><div style="font-size:18px;font-weight:700;">AIM Hygienic (Pvt) Limited</div><div style="font-size:12px;color:#52525b;">Expense Payment Receipt</div></div>
      </div>
      <div style="font-size:12px;text-align:right;color:#3f3f46;">
        <div><b>Receipt #:</b> ${escapeHtml(expense.expenseId || expense._id || "-")}</div>
        <div><b>Date:</b> ${new Date().toLocaleString()}</div>
      </div>
    </div>

    <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;margin-top:14px;font-size:12px;border-color:#d4d4d8;">
      <tbody>
        <tr><td><b>Expense Date</b></td><td>${fmtDate(expense.expenseDate)}</td><td><b>Category</b></td><td>${escapeHtml(expense.category || "-")}</td></tr>
        <tr><td><b>Amount</b></td><td>PKR ${Number(expense.amount || 0).toLocaleString()}</td><td><b>Payment Method</b></td><td>${escapeHtml((expense.paymentMethod || "-").toUpperCase())}</td></tr>
        <tr><td><b>Paid From Account</b></td><td>${escapeHtml(accountLabel || "-")}</td><td><b>Paid To</b></td><td>${escapeHtml(expense.paidTo || expense.vendorName || "-")}</td></tr>
        <tr><td><b>Reference</b></td><td>${escapeHtml(expense.paymentReference || "-")}</td><td><b>Status</b></td><td>${escapeHtml(expense.status || "-")}</td></tr>
      </tbody>
    </table>

    <div style="margin-top:14px;font-size:12px;"><b>Description/Notes:</b> ${escapeHtml(expense.description || expense.notes || "-")}</div>
    <div style="margin-top:20px;text-align:center;font-size:12px;color:#52525b;">Thank you for using AIM Hygienic expense management system.</div>
  </div>
</body>
</html>`;
  w.document.open();
  w.document.write(html);
  w.document.close();
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function accountName(accounts, accountId) {
  const id = typeof accountId === "string" ? accountId : accountId?._id;
  if (!id) return "-";
  const found = accounts.find((a) => a._id === id);
  return found ? `${found.accountName} (${found.accountType})` : id;
}

function Input({ label, value, onChange, type = "text", required }) {
  return (
    <div>
      <div className="text-sm font-medium">{label}</div>
      <input required={required} type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" />
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <div>
      <div className="text-sm font-medium">{label}</div>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm">
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function Metric({ label, value }) {
  return <div className="rounded-xl border bg-white p-4"><div className="text-xs text-zinc-500">{label}</div><div className="text-lg font-semibold">{value}</div></div>;
}

function Modal({ title, children, onClose }) {
  return <div className="fixed inset-0 z-[65]"><div className="absolute inset-0 bg-black/40" onClick={onClose} /><div className="absolute left-1/2 top-1/2 w-[95vw] max-w-4xl -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-5 shadow-2xl"><div className="mb-3 flex items-center justify-between"><div className="text-lg font-semibold">{title}</div><button onClick={onClose} className="rounded-md border px-2 py-1 text-sm">✕</button></div>{children}</div></div>;
}

function ReceiptRow({ label, value }) {
  return <div className="flex justify-between border-b py-1"><span className="text-zinc-600">{label}</span><span className="text-right font-medium">{value}</span></div>;
}

function money(v) { return `PKR ${Number(v || 0).toLocaleString()}`; }
function fmtDate(v) { return v ? new Date(v).toLocaleDateString() : "-"; }
function fmtDateTime(v) { return v ? new Date(v).toLocaleString() : "-"; }
