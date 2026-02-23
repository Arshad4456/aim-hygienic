"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { apiFetch } from "../../../../lib/api";

const tabs = [
  { key: "builty", label: "Builty Expense" },
  { key: "credit_note", label: "Credit Note Expense" },
  { key: "support", label: "Additional Support" },
  { key: "claim_discount", label: "Claims" },
];

export default function DistributorExpensePage() {
  const [active, setActive] = useState("builty");
  const [rows, setRows] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [distributors, setDistributors] = useState([]);
  const [form, setForm] = useState({ distributorId: "", territory: "", expenseDate: "", amount: "", paidTo: "", paymentMethod: "cash", fromAccountId: "", description: "", referenceNo: "", attachmentUrl: "", reason: "", employeeType: "Promoter", supportPeriod: "", claimType: "Discount Claim" });

  useEffect(() => {
    Promise.all([apiFetch("/expenses?section=distributor"), apiFetch("/accounts"), apiFetch("/users")]).then(([a, b, c]) => {
      setRows(a.expenses || []); setAccounts(b.accounts || []); setDistributors((c.users || []).filter((u) => String(u.role || "").toLowerCase().includes("distributor")));
    }).catch(() => {});
  }, []);

  async function save(e) {
    e.preventDefault();
    const status = active === "support" || active.startsWith("claim") ? "pending" : "posted";
    const subType = active === "claim_discount" ? claimSubType(form.claimType) : active;
    const dist = distributors.find((d) => d._id === form.distributorId);
    const payload = {
      section: "distributor",
      subType,
      category: active,
      distributorId: form.distributorId,
      territory: form.territory || dist?.territory || "",
      expenseDate: form.expenseDate,
      amount: Number(form.amount || 0),
      paymentMethod: form.paymentMethod,
      paymentMode: form.paymentMethod === "online" ? "bank_transfer" : form.paymentMethod,
      fromAccountId: form.fromAccountId,
      paidTo: form.paidTo,
      paymentReference: form.referenceNo,
      description: form.description,
      notes: `${form.reason} ${form.description}`.trim(),
      attachmentUrl: form.attachmentUrl,
      linkReference: form.referenceNo,
      approvalRequired: status === "pending",
      status,
      title: `Distributor ${tabs.find((t) => t.key === active)?.label || "expense"}`,
      expenseId: `DST-${Date.now()}`,
      metadata: {
        reason: form.reason,
        employeeType: form.employeeType,
        supportPeriod: form.supportPeriod,
        claimType: form.claimType,
      },
    };
    const r = await apiFetch("/expenses", { method: "POST", body: payload });
    setRows((s) => [r.expense, ...s]);
  }

  const monthly = useMemo(() => rows.reduce((m, r) => {
    const key = r.distributorId || "unknown";
    m[key] = (m[key] || 0) + Number(r.amount || 0);
    return m;
  }, {}), [rows]);

  return <AdminShell title="Distributor Expense" user={null}><div className="space-y-5">
    <div className="rounded-2xl border bg-white p-5"><h1 className="text-xl font-semibold">Distributor Expense</h1><p className="text-sm text-zinc-500">Monthly reimbursement, structured claims, and approval-driven support entries.</p>
      <div className="mt-4 flex flex-wrap gap-2">{tabs.map((t) => <button key={t.key} onClick={() => setActive(t.key)} className={`rounded-lg px-3 py-2 text-sm ${active===t.key?"bg-emerald-600 text-white":"border hover:bg-zinc-50"}`}>{t.label}</button>)}</div>
      <form onSubmit={save} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <Select label="Distributor" value={form.distributorId} onChange={(v)=>setForm((s)=>({...s, distributorId:v}))} options={[{value:"",label:"Select distributor"}, ...distributors.map((d)=>({value:d._id,label:d.name}))]} />
        <Input label="Territory/Region" value={form.territory} onChange={(v)=>setForm((s)=>({...s, territory:v}))} />
        <Input label="Date" type="date" value={form.expenseDate} onChange={(v)=>setForm((s)=>({...s, expenseDate:v}))} required />
        <Input label="Amount" type="number" value={form.amount} onChange={(v)=>setForm((s)=>({...s, amount:v}))} required />
        <Select label="Payment Method" value={form.paymentMethod} onChange={(v)=>setForm((s)=>({...s, paymentMethod:v}))} options={[{value:"cash",label:"Cash"},{value:"online",label:"Online"},{value:"cheque",label:"Cheque"}]} />
        <Select label="Paid From Account" value={form.fromAccountId} onChange={(v)=>setForm((s)=>({...s, fromAccountId:v}))} options={[{value:"",label:"Select account"}, ...accounts.map((a)=>({value:a._id,label:a.accountName}))]} />
        <Input label={active==="builty"?"Builty No / LR No":active==="credit_note"?"Credit Note No":"Reference"} value={form.referenceNo} onChange={(v)=>setForm((s)=>({...s, referenceNo:v}))} />
        <Input label="Paid To / Transporter / Payee" value={form.paidTo} onChange={(v)=>setForm((s)=>({...s, paidTo:v}))} />
        <Input label="Reason" value={form.reason} onChange={(v)=>setForm((s)=>({...s, reason:v}))} />
        {active==="support" ? <Select label="Employee Type" value={form.employeeType} onChange={(v)=>setForm((s)=>({...s, employeeType:v}))} options={[{value:"Promoter",label:"Promoter"},{value:"Helper",label:"Helper"},{value:"Loader",label:"Loader"},{value:"Other",label:"Other"}]} /> : null}
        {active==="support" ? <Input label="Support Period" value={form.supportPeriod} onChange={(v)=>setForm((s)=>({...s, supportPeriod:v}))} /> : null}
        {active==="claim_discount" ? <Select label="Claim Type" value={form.claimType} onChange={(v)=>setForm((s)=>({...s, claimType:v}))} options={[{value:"Discount Claim",label:"Discount Claim"},{value:"Offer Claim",label:"Offer Claim"},{value:"Coupon Claim",label:"Coupon/Lucky Draw Claim"}]} /> : null}
        <div className="md:col-span-2"><Input label="Description / Notes" value={form.description} onChange={(v)=>setForm((s)=>({...s, description:v}))} required /></div>
        <Input label="Attachment URL" value={form.attachmentUrl} onChange={(v)=>setForm((s)=>({...s, attachmentUrl:v}))} />
        <div className="md:col-span-3"><button className="rounded-xl bg-emerald-600 px-4 py-2 text-white">Add {tabs.find((t)=>t.key===active)?.label}</button></div>
      </form>
    </div>

    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">{Object.entries(monthly).slice(0,3).map(([dist, amount])=> <div key={dist} className="rounded-xl border bg-white p-4"><div className="text-xs text-zinc-500">Monthly total by distributor</div><div className="font-semibold">{dist}</div><div>PKR {Number(amount).toLocaleString()}</div></div>)}</div>

    <div className="overflow-auto rounded-xl border bg-white"><table className="min-w-full text-sm"><thead className="bg-zinc-50"><tr>{["Date","Distributor","Territory","Type","Reference","Amount","Status","Approved By","Attachment"].map((h)=><th key={h} className="border-b px-3 py-2 text-left">{h}</th>)}</tr></thead><tbody>{rows.map((r)=><tr key={r._id}><td className="border-b px-3 py-2">{new Date(r.expenseDate).toLocaleDateString()}</td><td className="border-b px-3 py-2">{r.distributorId||"-"}</td><td className="border-b px-3 py-2">{r.territory||"-"}</td><td className="border-b px-3 py-2">{r.subType}</td><td className="border-b px-3 py-2">{r.paymentReference||r.linkReference||"-"}</td><td className="border-b px-3 py-2">PKR {Number(r.amount||0).toLocaleString()}</td><td className="border-b px-3 py-2">{r.status}</td><td className="border-b px-3 py-2">{r.approvedBy||"-"}</td><td className="border-b px-3 py-2">{r.attachmentUrl?"View":"-"}</td></tr>)}{rows.length===0?<tr><td colSpan={9} className="px-3 py-6 text-center text-zinc-500">No distributor expenses</td></tr>:null}</tbody></table></div>
  </div></AdminShell>;
}

function claimSubType(claimType) { if (claimType === "Offer Claim") return "claim_offer"; if (claimType === "Coupon Claim") return "claim_coupon"; return "claim_discount"; }
function Input({ label, value, onChange, type="text", required }) { return <div><div className="text-sm font-medium">{label}</div><input required={required} type={type} value={value} onChange={(e)=>onChange(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" /></div>; }
function Select({ label, value, onChange, options }) { return <div><div className="text-sm font-medium">{label}</div><select value={value} onChange={(e)=>onChange(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm">{options.map((o)=><option key={o.value} value={o.value}>{o.label}</option>)}</select></div>; }