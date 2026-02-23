"use client";

import { useEffect, useMemo, useState } from "react";
import UserDashboardShell from "../../components/userDashboardShell";
import { userDashboardSearchItems } from "../../searchItems";
import { apiFetch } from "../../../lib/api";
import { getAuthItem } from "../../../lib/clientAuth";

const types = [
  { value: "builty", label: "Builty Expense" },
  { value: "credit_note", label: "Credit Note Expense" },
  { value: "support", label: "Additional Support" },
  { value: "claim_discount", label: "Discount Claim" },
  { value: "claim_offer", label: "Offer Claim" },
  { value: "claim_coupon", label: "Coupon/Lucky Draw Claim" },
];

export default function DistributorExpenseSelfPage() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ territory: "", subType: "builty", expenseDate: "", amount: "", paymentMethod: "cash", referenceNo: "", paidTo: "", description: "", attachmentUrl: "" });

  const me = useMemo(() => {
    try {
      return JSON.parse(getAuthItem("aim_user") || "{}");
    } catch {
      return {};
    }
  }, []);

  useEffect(() => {
    const distributorId = me._id || me.id || "";
    if (!distributorId) return;
    apiFetch(`/expenses?section=distributor`).then((d) => {
      const mine = (d.expenses || []).filter((x) => String(x.distributorId || "") === String(distributorId));
      setRows(mine);
    }).catch(() => {});
  }, [me]);

  async function submit(e) {
    e.preventDefault();
    const payload = {
      section: "distributor",
      subType: form.subType,
      category: form.subType,
      distributorId: me._id || me.id,
      territory: form.territory || me.territoryName || me.areaName || "",
      expenseDate: form.expenseDate,
      amount: Number(form.amount || 0),
      paymentMethod: form.paymentMethod,
      paymentMode: form.paymentMethod === "online" ? "bank_transfer" : form.paymentMethod,
      paidTo: form.paidTo,
      paymentReference: form.referenceNo,
      description: form.description,
      notes: form.description,
      attachmentUrl: form.attachmentUrl,
      approvalRequired: true,
      status: "pending",
      title: "Distributor submitted expense",
      expenseId: `DSE-${Date.now()}`,
    };

    const r = await apiFetch("/expenses", { method: "POST", body: payload });
    setRows((s) => [r.expense, ...s]);
    setForm((s) => ({ ...s, amount: "", expenseDate: "", referenceNo: "", paidTo: "", description: "", attachmentUrl: "" }));
  }

  return (
    <UserDashboardShell
      title="Distributor Expense"
      subtitle="Submit distributor expenses for admin approval/rejection."
      roleKey="Distributor"
      links={userDashboardSearchItems.distributor || []}
      showAccountCards
    >
      <div className="space-y-5">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h1 className="text-xl font-semibold">Submit Distributor Expense</h1>
          <p className="text-sm text-zinc-500">Every submitted expense remains pending until Admin approves or rejects it.</p>
          <form onSubmit={submit} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <Input label="Territory/Region" value={form.territory} onChange={(v) => setForm((s) => ({ ...s, territory: v }))} />
            <Select label="Expense Type" value={form.subType} onChange={(v) => setForm((s) => ({ ...s, subType: v }))} options={types} />
            <Input label="Date" type="date" value={form.expenseDate} onChange={(v) => setForm((s) => ({ ...s, expenseDate: v }))} required />
            <Input label="Amount" type="number" value={form.amount} onChange={(v) => setForm((s) => ({ ...s, amount: v }))} required />
            <Select label="Payment Method" value={form.paymentMethod} onChange={(v) => setForm((s) => ({ ...s, paymentMethod: v }))} options={[{ value: "cash", label: "Cash" }, { value: "online", label: "Online" }, { value: "cheque", label: "Cheque" }]} />
            <Input label="Reference No" value={form.referenceNo} onChange={(v) => setForm((s) => ({ ...s, referenceNo: v }))} />
            <Input label="Paid To" value={form.paidTo} onChange={(v) => setForm((s) => ({ ...s, paidTo: v }))} />
            <div className="md:col-span-2"><Input label="Description" value={form.description} onChange={(v) => setForm((s) => ({ ...s, description: v }))} required /></div>
            <Input label="Attachment URL" value={form.attachmentUrl} onChange={(v) => setForm((s) => ({ ...s, attachmentUrl: v }))} />
            <div className="md:col-span-3"><button className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white">Submit Expense</button></div>
          </form>
        </div>

        <div className="overflow-auto rounded-xl border bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50"><tr>{["Date", "Type", "Amount", "Territory", "Reference", "Status", "Admin Decision"].map((h) => <th key={h} className="border-b px-3 py-2 text-left">{h}</th>)}</tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r._id}>
                  <td className="border-b px-3 py-2">{r.expenseDate ? new Date(r.expenseDate).toLocaleDateString() : "-"}</td>
                  <td className="border-b px-3 py-2">{r.subType || "-"}</td>
                  <td className="border-b px-3 py-2">PKR {Number(r.amount || 0).toLocaleString()}</td>
                  <td className="border-b px-3 py-2">{r.territory || "-"}</td>
                  <td className="border-b px-3 py-2">{r.paymentReference || "-"}</td>
                  <td className="border-b px-3 py-2">{r.status || "pending"}</td>
                  <td className="border-b px-3 py-2">{r.status === "approved" ? `Approved by ${r.approvedBy || "Admin"}` : r.status === "rejected" ? "Rejected by Admin" : "Awaiting review"}</td>
                </tr>
              ))}
              {rows.length === 0 ? <tr><td className="px-3 py-6 text-center text-zinc-500" colSpan={7}>No expenses submitted yet.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>
    </UserDashboardShell>
  );
}

function Input({ label, value, onChange, type = "text", required = false }) {
  return <div><div className="text-sm font-medium">{label}</div><input required={required} type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" /></div>;
}

function Select({ label, value, onChange, options }) {
  return <div><div className="text-sm font-medium">{label}</div><select value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm">{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>;
}