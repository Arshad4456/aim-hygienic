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
  const [preview, setPreview] = useState(null);
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(getAuthItem("aim_user") || "{}");
    } catch {
      return {};
    }
  });
  const [loadingUser, setLoadingUser] = useState(true);

  const [form, setForm] = useState({ subType: "builty", expenseDate: "", amount: "", paymentMethod: "cash", referenceNo: "", paidTo: "", description: "", attachmentUrl: "" });

  useEffect(() => {
    let ignore = false;
    apiFetch("/users/me")
      .then((res) => {
        if (ignore) return;
        if (res?.user) {
          setCurrentUser((prev) => ({ ...prev, ...res.user }));
        }
      })
      .catch(() => {})
      .finally(() => {
        if (ignore) return;
        setLoadingUser(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  const autoTerritory = useMemo(() => {
    return (
      currentUser.territoryName ||
      currentUser.territory ||
      currentUser.areaName ||
      currentUser.zoneName ||
      currentUser.regionName ||
      currentUser.fieldName ||
      ""
    );
  }, [currentUser]);

  useEffect(() => {
    const distributorId = currentUser._id || currentUser.id || "";
    if (!distributorId) return;
    apiFetch(`/expenses?section=distributor`)
      .then((d) => {
        const mine = (d.expenses || []).filter((x) => String(x.distributorId || "") === String(distributorId));
        setRows(mine);
      })
      .catch(() => {});
  }, [currentUser]);

  const totalExpense = useMemo(() => rows.reduce((sum, r) => sum + Number(r.amount || 0), 0), [rows]);

  const monthlyTotal = useMemo(() => {
    const now = new Date();
    return rows
      .filter((r) => {
        const d = new Date(r.expenseDate || r.createdAt);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((sum, r) => sum + Number(r.amount || 0), 0);
  }, [rows]);

  async function submit(e) {
    e.preventDefault();
    const territory = autoTerritory || "";
    if (!territory) {
      alert("Territory is not configured for this distributor. Please contact admin.");
      return;
    }

    const payload = {
      section: "distributor",
      subType: form.subType,
      category: form.subType,
      distributorId: currentUser._id || currentUser.id,
      territory,
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
            <Input label="Territory/Region" value={loadingUser ? "Loading..." : autoTerritory || "Not configured"} onChange={() => {}} disabled />
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

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Card label="Total Expense" value={`PKR ${totalExpense.toLocaleString()}`} />
          <Card label="This Month Total Expense" value={`PKR ${monthlyTotal.toLocaleString()}`} />
        </div>

        <div className="overflow-auto rounded-xl border bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50"><tr>{["Date", "Type", "Amount", "Territory", "Reference", "Status", "Admin Decision", "Action"].map((h) => <th key={h} className="border-b px-3 py-2 text-left">{h}</th>)}</tr></thead>
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
                  <td className="border-b px-3 py-2"><button type="button" onClick={() => setPreview(r)} className="rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100">Preview</button></td>
                </tr>
              ))}
              {rows.length === 0 ? <tr><td className="px-3 py-6 text-center text-zinc-500" colSpan={8}>No expenses submitted yet.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>

      {preview ? (
        <Modal title="Expense Preview" onClose={() => setPreview(null)}>
          <div className="rounded-xl border bg-zinc-50 p-4 text-sm">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <PreviewRow k="Expense ID" v={preview.expenseId || preview._id} />
              <PreviewRow k="Date" v={preview.expenseDate ? new Date(preview.expenseDate).toLocaleDateString() : "-"} />
              <PreviewRow k="Type" v={preview.subType || "-"} />
              <PreviewRow k="Amount" v={`PKR ${Number(preview.amount || 0).toLocaleString()}`} />
              <PreviewRow k="Territory" v={preview.territory || "-"} />
              <PreviewRow k="Payment Method" v={(preview.paymentMethod || "-").toUpperCase()} />
              <PreviewRow k="Reference" v={preview.paymentReference || "-"} />
              <PreviewRow k="Paid To" v={preview.paidTo || "-"} />
              <PreviewRow k="Status" v={preview.status || "pending"} />
              <PreviewRow k="Attachment" v={preview.attachmentUrl || "-"} />
            </div>
            <div className="mt-3 border-t pt-3"><div className="font-semibold">Description</div><div className="text-zinc-700">{preview.description || preview.notes || "-"}</div></div>
          </div>
          <div className="mt-4 flex justify-end"><button onClick={() => setPreview(null)} className="rounded-lg border px-4 py-2">Close</button></div>
        </Modal>
      ) : null}
    </UserDashboardShell>
  );
}

function Input({ label, value, onChange, type = "text", required = false, disabled = false }) {
  return <div><div className="text-sm font-medium">{label}</div><input disabled={disabled} required={required} type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm disabled:bg-zinc-100" /></div>;
}

function Select({ label, value, onChange, options }) {
  return <div><div className="text-sm font-medium">{label}</div><select value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm">{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>;
}

function Card({ label, value }) { return <div className="rounded-xl border bg-white p-4"><div className="text-xs text-zinc-500">{label}</div><div className="text-lg font-semibold">{value}</div></div>; }
function Modal({ title, children, onClose }) { return <div className="fixed inset-0 z-[65]"><div className="absolute inset-0 bg-black/40" onClick={onClose} /><div className="absolute left-1/2 top-1/2 w-[95vw] max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-5 shadow-2xl"><div className="mb-3 flex items-center justify-between"><div className="text-lg font-semibold">{title}</div><button onClick={onClose} className="rounded-md border px-2 py-1 text-sm">✕</button></div>{children}</div></div>; }
function PreviewRow({ k, v }) { return <div className="flex justify-between border-b py-1"><span className="text-zinc-600">{k}</span><span className="font-medium text-right">{v}</span></div>; }