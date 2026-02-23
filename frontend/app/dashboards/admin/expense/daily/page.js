"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { apiFetch } from "../../../../lib/api";

export default function DailyExpensePage() {
  const [rows, setRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [form, setForm] = useState({
    expenseDate: "",
    spenderUserId: "",
    spenderName: "",
    expenseType: "Cash Expense",
    amount: "",
    fromAccountId: "",
    paidTo: "",
    referenceNo: "",
    description: "",
    attachmentUrl: "",
    isTransfer: false,
    transferToAccountId: "",
  });

  useEffect(() => {
    Promise.all([apiFetch("/expenses?section=daily"), apiFetch("/users"), apiFetch("/accounts")])
      .then(([a, b, c]) => {
        setRows(a.expenses || []);
        setUsers(b.users || []);
        setAccounts(c.accounts || []);
      })
      .catch(() => {});
  }, []);

  const spenderOptions = useMemo(() => {
    return users
      .filter((u) => String(u.role || "").toLowerCase() !== "customer")
      .map((u) => {
        const name = userDisplayName(u);
        const location = userEndLocation(u);
        return {
          value: u._id,
          label: location ? `${name} (${u.role}) · ${location}` : `${name} (${u.role})`,
          spenderName: name,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [users]);

  const filteredRows = useMemo(() => {
    const from = filterFrom ? new Date(`${filterFrom}T00:00:00`) : null;
    const to = filterTo ? new Date(`${filterTo}T23:59:59`) : null;

    return rows.filter((row) => {
      const d = new Date(row.expenseDate || row.createdAt);
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });
  }, [rows, filterFrom, filterTo]);

  const topSpenders = useMemo(
    () =>
      Object.entries(
        filteredRows.reduce((m, r) => {
          const k = r.spenderName || "Unknown";
          m[k] = (m[k] || 0) + Number(r.amount || 0);
          return m;
        }, {})
      )
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3),
    [filteredRows]
  );

  async function submit(e) {
    e.preventDefault();
    const option = spenderOptions.find((u) => u.value === form.spenderUserId);
    const payload = {
      section: "daily",
      subType: form.isTransfer ? "bank_transfer" : "daily_expense",
      category: form.expenseType,
      expenseType: form.expenseType,
      spenderUserId: form.spenderUserId,
      spenderName: option ? option.spenderName : form.spenderName,
      amount: Number(form.amount || 0),
      fromAccountId: form.fromAccountId,
      paidTo: form.paidTo,
      paymentMethod: form.expenseType === "Cash Expense" ? "cash" : "online",
      paymentMode: form.expenseType === "Cash Expense" ? "cash" : "bank_transfer",
      paymentReference: form.referenceNo,
      expenseDate: form.expenseDate,
      description: form.description,
      notes: form.description,
      attachmentUrl: form.attachmentUrl,
      isTransfer: form.isTransfer,
      transferToAccountId: form.transferToAccountId,
      approvalRequired: Number(form.amount || 0) > 50000,
      status: Number(form.amount || 0) > 50000 ? "pending" : "posted",
      expenseId: `DAY-${Date.now()}`,
      title: "Daily operational expense",
    };
    const r = await apiFetch("/expenses", { method: "POST", body: payload });
    setRows((s) => [r.expense, ...s]);
  }

  async function onDelete(id) {
    if (!confirm("Delete this daily expense record?")) return;
    await apiFetch(`/expenses/${id}`, { method: "DELETE" });
    setRows((s) => s.filter((row) => row._id !== id));
  }

  return (
    <AdminShell title="Daily Expense" user={null}>
      <div className="space-y-5">
        <div className="rounded-2xl border bg-white p-5">
          <h1 className="text-xl font-semibold">Daily Expense</h1>
          <p className="text-sm text-zinc-500">Track operational spending by user/role with transfer separation and daily insights.</p>
          <form onSubmit={submit} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <Input label="Expense Date" type="date" value={form.expenseDate} onChange={(v) => setForm((s) => ({ ...s, expenseDate: v }))} required />
            <Select
              label="Spender/User"
              value={form.spenderUserId}
              onChange={(v) => setForm((s) => ({ ...s, spenderUserId: v }))}
              options={[{ value: "", label: "Select user" }, ...spenderOptions.map((u) => ({ value: u.value, label: u.label }))]}
            />
            <Select label="Expense Type" value={form.expenseType} onChange={(v) => setForm((s) => ({ ...s, expenseType: v }))} options={[{ value: "Cash Expense", label: "Cash Expense" }, { value: "Online Payment", label: "Online Payment" }, { value: "Bank-to-Bank Transfer", label: "Bank-to-Bank Transfer" }]} />
            <Input label="Amount" type="number" value={form.amount} onChange={(v) => setForm((s) => ({ ...s, amount: v }))} required />
            <Select label="Paid From Account" value={form.fromAccountId} onChange={(v) => setForm((s) => ({ ...s, fromAccountId: v }))} options={[{ value: "", label: "Select account" }, ...accounts.map((a) => ({ value: a._id, label: `${a.accountName} (${a.accountType})` }))]} />
            <Input label="Paid To" value={form.paidTo} onChange={(v) => setForm((s) => ({ ...s, paidTo: v }))} required />
            <Input label="Reference No" value={form.referenceNo} onChange={(v) => setForm((s) => ({ ...s, referenceNo: v }))} />
            <Input label="Description" value={form.description} onChange={(v) => setForm((s) => ({ ...s, description: v }))} required />
            <Input label="Attachment URL" value={form.attachmentUrl} onChange={(v) => setForm((s) => ({ ...s, attachmentUrl: v }))} />
            <div className="flex items-end"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isTransfer} onChange={(e) => setForm((s) => ({ ...s, isTransfer: e.target.checked }))} />This is Transfer (not expense)</label></div>
            {form.isTransfer ? <Select label="Transfer To Account" value={form.transferToAccountId} onChange={(v) => setForm((s) => ({ ...s, transferToAccountId: v }))} options={[{ value: "", label: "Select destination" }, ...accounts.map((a) => ({ value: a._id, label: a.accountName }))]} /> : null}
            <div className="md:col-span-3"><button className="rounded-xl bg-emerald-600 px-4 py-2 text-white">Save Daily Entry</button></div>
          </form>
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

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {topSpenders.map(([name, amount]) => (
            <div key={name} className="rounded-xl border bg-white p-4"><div className="text-xs text-zinc-500">Top spender</div><div className="font-semibold">{name}</div><div>{`PKR ${amount.toLocaleString()}`}</div></div>
          ))}
        </div>

        <div className="overflow-auto rounded-xl border bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50">
              <tr>{["Date", "Spender", "Type", "Amount", "From Account", "To", "Reference", "Notes", "Attachment", "Status", "Actions"].map((h) => <th key={h} className="border-b px-3 py-2 text-left">{h}</th>)}</tr>
            </thead>
            <tbody>
              {filteredRows.map((r) => (
                <tr key={r._id}>
                  <td className="border-b px-3 py-2">{fmtDate(r.expenseDate)}</td>
                  <td className="border-b px-3 py-2">{r.spenderName || "-"}</td>
                  <td className="border-b px-3 py-2">{r.expenseType || r.category}</td>
                  <td className="border-b px-3 py-2">PKR {Number(r.amount || 0).toLocaleString()}</td>
                  <td className="border-b px-3 py-2">{accountName(accounts, r.fromAccountId)}</td>
                  <td className="border-b px-3 py-2">{r.paidTo || "-"}</td>
                  <td className="border-b px-3 py-2">{r.paymentReference || "-"}</td>
                  <td className="border-b px-3 py-2">{r.description || "-"}</td>
                  <td className="border-b px-3 py-2">{r.attachmentUrl ? <a className="text-indigo-600 underline" target="_blank" rel="noreferrer" href={r.attachmentUrl}>View</a> : "-"}</td>
                  <td className="border-b px-3 py-2">{r.status}</td>
                  <td className="border-b px-3 py-2">
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setSelectedReceipt(r)} className="rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100">Receipt</button>
                      <button type="button" onClick={() => onDelete(r._id)} className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRows.length === 0 ? <tr><td colSpan={11} className="px-3 py-6 text-center text-zinc-500">No daily expenses</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>

      {selectedReceipt ? (
        <Modal title="AIM Hygienic Daily Expense Receipt" onClose={() => setSelectedReceipt(null)}>
          <div className="rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 p-4">
            <div className="mb-3 flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-600 text-lg font-bold text-white">AH</div>
                <div><div className="text-lg font-bold">AIM Hygienic (Pvt) Limited</div><div className="text-xs text-zinc-500">Daily Expense Receipt</div></div>
              </div>
              <div className="text-right text-xs text-zinc-600"><div><b>Receipt #:</b> {selectedReceipt.expenseId || selectedReceipt._id}</div><div><b>Generated:</b> {new Date().toLocaleString()}</div></div>
            </div>
            <div className="grid grid-cols-1 gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
              <ReceiptRow label="Date" value={fmtDate(selectedReceipt.expenseDate)} />
              <ReceiptRow label="Spender" value={selectedReceipt.spenderName || "-"} />
              <ReceiptRow label="Expense Type" value={selectedReceipt.expenseType || selectedReceipt.category || "-"} />
              <ReceiptRow label="Amount" value={`PKR ${Number(selectedReceipt.amount || 0).toLocaleString()}`} />
              <ReceiptRow label="Payment Method" value={(selectedReceipt.paymentMethod || "-").toUpperCase()} />
              <ReceiptRow label="Paid From" value={accountName(accounts, selectedReceipt.fromAccountId)} />
              <ReceiptRow label="Paid To" value={selectedReceipt.paidTo || "-"} />
              <ReceiptRow label="Reference No" value={selectedReceipt.paymentReference || "-"} />
              <ReceiptRow label="Status" value={selectedReceipt.status || "-"} />
            </div>
            <div className="mt-3 border-t pt-3 text-sm"><div className="mb-1 font-semibold">Description / Notes</div><div className="text-zinc-700">{selectedReceipt.description || selectedReceipt.notes || "-"}</div></div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => printDailyReceipt(selectedReceipt, accountName(accounts, selectedReceipt.fromAccountId))} className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-indigo-700">Print Receipt</button>
            <button type="button" onClick={() => setSelectedReceipt(null)} className="rounded-lg border px-4 py-2">Close</button>
          </div>
        </Modal>
      ) : null}
    </AdminShell>
  );
}

function userDisplayName(user) {
  return user.fullName || user.name || user.username || user.mobile || "Unknown User";
}

function userEndLocation(user) {
  const role = String(user.role || "").toLowerCase();
  if (role === "order booker") return user.fieldName || user.territoryName || user.zoneName || user.regionName || user.warehouseName || "";
  if (role === "warehouse manager") return user.warehouseName || user.regionName || "";
  return user.fieldName || user.territoryName || user.areaName || user.zoneName || user.regionName || user.warehouseName || "";
}

function accountName(accounts, accountId) {
  const id = typeof accountId === "string" ? accountId : accountId?._id;
  if (!id) return "-";
  const found = accounts.find((a) => a._id === id);
  return found ? `${found.accountName} (${found.accountType})` : id;
}

function printDailyReceipt(expense, accountLabel) {
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) return;
  const html = `<!doctype html><html><head><title>Daily Expense Receipt</title></head><body style="font-family:Arial,sans-serif;background:#f3f4f6;padding:20px;"><div style="max-width:760px;margin:0 auto;background:#fff;border:1px solid #d4d4d8;border-radius:12px;padding:18px;"><div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e4e4e7;padding-bottom:12px;"><div style="display:flex;align-items:center;gap:10px;"><div style="width:50px;height:50px;border-radius:10px;background:#059669;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:18px;">AH</div><div><div style="font-size:18px;font-weight:700;">AIM Hygienic (Pvt) Limited</div><div style="font-size:12px;color:#52525b;">Daily Expense Receipt</div></div></div><div style="font-size:12px;text-align:right;color:#3f3f46;"><div><b>Receipt #:</b> ${escapeHtml(expense.expenseId || expense._id || "-")}</div><div><b>Date:</b> ${new Date().toLocaleString()}</div></div></div><table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;margin-top:14px;font-size:12px;border-color:#d4d4d8;"><tbody><tr><td><b>Expense Date</b></td><td>${fmtDate(expense.expenseDate)}</td><td><b>Spender</b></td><td>${escapeHtml(expense.spenderName || "-")}</td></tr><tr><td><b>Expense Type</b></td><td>${escapeHtml(expense.expenseType || expense.category || "-")}</td><td><b>Amount</b></td><td>PKR ${Number(expense.amount || 0).toLocaleString()}</td></tr><tr><td><b>Payment Method</b></td><td>${escapeHtml((expense.paymentMethod || "-").toUpperCase())}</td><td><b>From Account</b></td><td>${escapeHtml(accountLabel || "-")}</td></tr><tr><td><b>Paid To</b></td><td>${escapeHtml(expense.paidTo || "-")}</td><td><b>Reference</b></td><td>${escapeHtml(expense.paymentReference || "-")}</td></tr></tbody></table><div style="margin-top:14px;font-size:12px;"><b>Description/Notes:</b> ${escapeHtml(expense.description || expense.notes || "-")}</div><div style="margin-top:20px;text-align:center;font-size:12px;color:#52525b;">Thank you for using AIM Hygienic expense management system.</div></div></body></html>`;
  w.document.open();
  w.document.write(html);
  w.document.close();
}

function escapeHtml(value) {
  return String(value || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function Input({ label, value, onChange, type = "text", required }) {
  return <div><div className="text-sm font-medium">{label}</div><input required={required} type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" /></div>;
}

function Select({ label, value, onChange, options }) {
  return <div><div className="text-sm font-medium">{label}</div><select value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm">{options.map((o) => <option value={o.value} key={o.value}>{o.label}</option>)}</select></div>;
}

function Modal({ title, children, onClose }) {
  return <div className="fixed inset-0 z-[65]"><div className="absolute inset-0 bg-black/40" onClick={onClose} /><div className="absolute left-1/2 top-1/2 w-[95vw] max-w-4xl -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-5 shadow-2xl"><div className="mb-3 flex items-center justify-between"><div className="text-lg font-semibold">{title}</div><button onClick={onClose} className="rounded-md border px-2 py-1 text-sm">✕</button></div>{children}</div></div>;
}

function ReceiptRow({ label, value }) {
  return <div className="flex justify-between border-b py-1"><span className="text-zinc-600">{label}</span><span className="text-right font-medium">{value}</span></div>;
}

function fmtDate(v) {
  return v ? new Date(v).toLocaleDateString() : "-";
}