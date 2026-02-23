"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { apiFetch } from "../../../../lib/api";

const categories = ["Kitchen Expense", "Guest Expense", "Fuel Expense", "Rent Expense", "Legal Expense", "Utility Expense", "Delivery Expense", "Electricity Expense", "Mobile Expense", "Refreshment Expense", "Salary Expense", "Other"];

export default function PersonalExpensePage() {
  const [rows, setRows] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState({ category: categories[0], expenseDate: "", amount: "", paymentMethod: "cash", fromAccountId: "", paidTo: "", description: "", attachmentUrl: "" });

  useEffect(() => {
    Promise.all([apiFetch("/expenses?section=personal"), apiFetch("/accounts")])
      .then(([expenseData, accountData]) => { setRows(expenseData.expenses || []); setAccounts(accountData.accounts || []); })
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
    setForm({ ...form, amount: "", paidTo: "", description: "", attachmentUrl: "" });
  }

  const monthRows = rows.filter((r) => { const d = new Date(r.expenseDate || r.createdAt); const n = new Date(); return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear(); });
  const today = rows.filter((r) => new Date(r.expenseDate).toDateString() === new Date().toDateString());

  return <AdminShell title="AIM – Personal Expense" user={null}><div className="space-y-5">
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
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3"><Metric label="Today" value={money(today.reduce((s, r) => s + Number(r.amount || 0), 0))} /><Metric label="This Month" value={money(monthRows.reduce((s, r) => s + Number(r.amount || 0), 0))} /><Metric label="Transactions" value={String(monthRows.length)} /></div>
    <Ledger rows={rows} columns={["Date", "Category", "Amount", "Payment", "Account", "Notes", "Created By", "Attachment"]} mapRow={(r) => [fmtDate(r.expenseDate), r.category, money(r.amount), r.paymentMethod, r.fromAccountId || "-", r.description || r.notes, r.requestedBy || "System", r.attachmentUrl ? "View" : "-"]} />
  </div></AdminShell>;
}

function Ledger({ rows, columns, mapRow }) { return <div className="overflow-auto rounded-xl border bg-white"><table className="min-w-full text-sm"><thead className="bg-zinc-50"> <tr>{columns.map((c) => <th key={c} className="border-b px-3 py-2 text-left">{c}</th>)}</tr></thead><tbody>{rows.map((r) => <tr key={r._id}>{mapRow(r).map((v, i) => <td key={i} className="border-b px-3 py-2">{v}</td>)}</tr>)}{rows.length===0?<tr><td className="px-3 py-6 text-center text-zinc-500" colSpan={columns.length}>No entries</td></tr>:null}</tbody></table></div>; }
function Input({ label, value, onChange, type = "text", required }) { return <div><div className="text-sm font-medium">{label}</div><input required={required} type={type} value={value} onChange={(e)=>onChange(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" /></div>; }
function Select({ label, value, onChange, options }) { return <div><div className="text-sm font-medium">{label}</div><select value={value} onChange={(e)=>onChange(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm">{options.map((o)=><option key={o.value} value={o.value}>{o.label}</option>)}</select></div>; }
function Metric({ label, value }) { return <div className="rounded-xl border bg-white p-4"><div className="text-xs text-zinc-500">{label}</div><div className="text-lg font-semibold">{value}</div></div>; }
function money(v) { return `PKR ${Number(v||0).toLocaleString()}`; }
function fmtDate(v) { return v ? new Date(v).toLocaleDateString() : "-"; }