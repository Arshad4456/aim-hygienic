"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { apiFetch } from "../../../../lib/api";

export default function DailyExpensePage() {
  const [rows, setRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState({ expenseDate: "", spenderUserId: "", spenderName: "", expenseType: "Cash Expense", amount: "", fromAccountId: "", paidTo: "", referenceNo: "", description: "", attachmentUrl: "", isTransfer: false, transferToAccountId: "" });

  useEffect(() => {
    Promise.all([apiFetch("/expenses?section=daily"), apiFetch("/users"), apiFetch("/accounts")]).then(([a, b, c]) => {
      setRows(a.expenses || []); setUsers(b.users || []); setAccounts(c.accounts || []);
    }).catch(() => {});
  }, []);

  const topSpenders = useMemo(() => Object.entries(rows.reduce((m, r) => {
    const k = r.spenderName || "Unknown"; m[k] = (m[k] || 0) + Number(r.amount || 0); return m;
  }, {})).sort((a, b) => b[1] - a[1]).slice(0, 3), [rows]);

  async function submit(e) {
    e.preventDefault();
    const user = users.find((u) => u._id === form.spenderUserId);
    const payload = {
      section: "daily",
      subType: form.isTransfer ? "bank_transfer" : "daily_expense",
      category: form.expenseType,
      expenseType: form.expenseType,
      spenderUserId: form.spenderUserId,
      spenderName: user ? user.name : form.spenderName,
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

  return <AdminShell title="Daily Expense" user={null}><div className="space-y-5">
    <div className="rounded-2xl border bg-white p-5">
      <h1 className="text-xl font-semibold">Daily Expense</h1><p className="text-sm text-zinc-500">Track operational spending by user/role with transfer separation and daily insights.</p>
      <form onSubmit={submit} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <Input label="Expense Date" type="date" value={form.expenseDate} onChange={(v)=>setForm((s)=>({...s, expenseDate:v}))} required />
        <Select label="Spender/User" value={form.spenderUserId} onChange={(v)=>setForm((s)=>({...s, spenderUserId:v}))} options={[{value:"",label:"Select user"}, ...users.map((u)=>({value:u._id,label:`${u.name} (${u.role})`}))]} />
        <Select label="Expense Type" value={form.expenseType} onChange={(v)=>setForm((s)=>({...s, expenseType:v}))} options={[{value:"Cash Expense",label:"Cash Expense"},{value:"Online Payment",label:"Online Payment"},{value:"Bank-to-Bank Transfer",label:"Bank-to-Bank Transfer"}]} />
        <Input label="Amount" type="number" value={form.amount} onChange={(v)=>setForm((s)=>({...s, amount:v}))} required />
        <Select label="Paid From Account" value={form.fromAccountId} onChange={(v)=>setForm((s)=>({...s, fromAccountId:v}))} options={[{value:"",label:"Select account"}, ...accounts.map((a)=>({value:a._id,label:a.accountName}))]} />
        <Input label="Paid To" value={form.paidTo} onChange={(v)=>setForm((s)=>({...s, paidTo:v}))} required />
        <Input label="Reference No" value={form.referenceNo} onChange={(v)=>setForm((s)=>({...s, referenceNo:v}))} />
        <Input label="Description" value={form.description} onChange={(v)=>setForm((s)=>({...s, description:v}))} required />
        <Input label="Attachment URL" value={form.attachmentUrl} onChange={(v)=>setForm((s)=>({...s, attachmentUrl:v}))} />
        <div className="flex items-end"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isTransfer} onChange={(e)=>setForm((s)=>({...s, isTransfer:e.target.checked}))} />This is Transfer (not expense)</label></div>
        {form.isTransfer ? <Select label="Transfer To Account" value={form.transferToAccountId} onChange={(v)=>setForm((s)=>({...s, transferToAccountId:v}))} options={[{value:"",label:"Select destination"}, ...accounts.map((a)=>({value:a._id,label:a.accountName}))]} /> : null}
        <div className="md:col-span-3"><button className="rounded-xl bg-emerald-600 px-4 py-2 text-white">Save Daily Entry</button></div>
      </form>
    </div>

    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">{topSpenders.map(([name, amount]) => <div key={name} className="rounded-xl border bg-white p-4"><div className="text-xs text-zinc-500">Top spender</div><div className="font-semibold">{name}</div><div>{`PKR ${amount.toLocaleString()}`}</div></div>)}</div>

    <div className="overflow-auto rounded-xl border bg-white"><table className="min-w-full text-sm"><thead className="bg-zinc-50"><tr>{["Date","Spender","Type","Amount","From Account","To","Reference","Notes","Attachment","Status"].map((h)=><th key={h} className="border-b px-3 py-2 text-left">{h}</th>)}</tr></thead><tbody>{rows.map((r)=><tr key={r._id}><td className="border-b px-3 py-2">{new Date(r.expenseDate).toLocaleDateString()}</td><td className="border-b px-3 py-2">{r.spenderName||"-"}</td><td className="border-b px-3 py-2">{r.expenseType||r.category}</td><td className="border-b px-3 py-2">PKR {Number(r.amount||0).toLocaleString()}</td><td className="border-b px-3 py-2">{r.fromAccountId||"-"}</td><td className="border-b px-3 py-2">{r.paidTo||"-"}</td><td className="border-b px-3 py-2">{r.paymentReference||"-"}</td><td className="border-b px-3 py-2">{r.description||"-"}</td><td className="border-b px-3 py-2">{r.attachmentUrl?"View":"-"}</td><td className="border-b px-3 py-2">{r.status}</td></tr>)}{rows.length===0?<tr><td colSpan={10} className="px-3 py-6 text-center text-zinc-500">No daily expenses</td></tr>:null}</tbody></table></div>
  </div></AdminShell>;
}

function Input({ label, value, onChange, type="text", required }) { return <div><div className="text-sm font-medium">{label}</div><input required={required} type={type} value={value} onChange={(e)=>onChange(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" /></div>; }
function Select({ label, value, onChange, options }) { return <div><div className="text-sm font-medium">{label}</div><select value={value} onChange={(e)=>onChange(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm">{options.map((o)=><option value={o.value} key={o.value}>{o.label}</option>)}</select></div>; }
