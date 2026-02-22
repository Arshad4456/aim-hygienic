"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { apiFetch } from "../../../../lib/api";

const ACCOUNT_TYPES = [
  ["bank", "Bank Account"],
  ["cash", "Cash Account"],
  ["easypaisa", "Easypaisa"],
  ["jazzcash", "JazzCash"],
  ["other", "Other"],
];

const REFERENCE_TYPES = [
  ["primary_payment", "Primary Payment"],
  ["secondary_payment", "Secondary Payment"],
  ["expense", "Expense"],
  ["salary", "Salary"],
  ["supplier_payment", "Supplier Payment"],
  ["manual_entry", "Manual Entry"],
  ["other", "Other"],
];

const PAK_BANKS = ["HBL", "UBL", "Meezan Bank", "Bank Alfalah", "MCB", "Allied Bank", "Askari Bank", "Faysal Bank", "Bank of Punjab", "Standard Chartered"];

const newAccountForm = {
  accountName: "",
  accountType: "bank",
  bankName: "Meezan Bank",
  branchName: "",
  branchCode: "",
  accountTitle: "",
  accountNumber: "",
  iban: "",
  swiftCode: "",
  openingBalance: "",
  openingDate: new Date().toISOString().slice(0, 10),
  currency: "PKR",
  status: "active",
  notes: "",
};

const newTransactionForm = {
  type: "cash_in",
  amount: "",
  transactionDate: new Date().toISOString().slice(0, 10),
  referenceType: "manual_entry",
  referenceId: "",
  description: "",
  attachmentUrl: "",
};

export default function AccountManagementPage() {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [accountDetail, setAccountDetail] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [form, setForm] = useState(newAccountForm);
  const [transactionForm, setTransactionForm] = useState(newTransactionForm);
  const [editModal, setEditModal] = useState({ open: false, data: null });
  const [receiptTransaction, setReceiptTransaction] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const pushToast = useCallback((type, message) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2800);
  }, []);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/accounts");
      const next = res.accounts || [];
      setAccounts(next);
      if (!selectedAccountId && next.length) setSelectedAccountId(next[0]._id);
      if (selectedAccountId && !next.some((a) => a._id === selectedAccountId)) setSelectedAccountId(next[0]?._id || null);
    } catch (e) {
      pushToast("error", e.message || "Failed to load accounts");
    } finally {
      setLoading(false);
    }
  }, [pushToast, selectedAccountId]);

  const loadDetail = useCallback(async (id) => {
    if (!id) {
      setAccountDetail(null);
      setTransactions([]);
      return;
    }
    try {
      const [detailRes, txRes] = await Promise.all([apiFetch(`/accounts/${id}`), apiFetch(`/accounts/${id}/transactions`)]);
      setAccountDetail(detailRes);
      setTransactions(txRes.transactions || []);
    } catch (e) {
      pushToast("error", e.message || "Failed to load account detail");
    }
  }, [pushToast]);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);
  useEffect(() => { loadDetail(selectedAccountId); }, [selectedAccountId, loadDetail]);

  const expenseSplit = useMemo(() => {
    const out = { salary: 0, supplier_payment: 0, expense: 0, logistics: 0 };
    transactions.forEach((item) => {
      if (item.type !== "cash_out") return;
      if (item.referenceType in out) out[item.referenceType] += item.amount;
      else out.logistics += item.amount;
    });
    return out;
  }, [transactions]);

  async function onCreateAccount(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch("/accounts", { method: "POST", body: { ...form, openingBalance: Number(form.openingBalance || 0) } });
      pushToast("success", "Account created successfully");
      setForm(newAccountForm);
      await loadAccounts();
    } catch (e2) {
      pushToast("error", e2.message || "Failed to create account");
    } finally {
      setSaving(false);
    }
  }

  async function onUpdateAccount() {
    if (!editModal.data?._id) return;
    setSaving(true);
    try {
      await apiFetch(`/accounts/${editModal.data._id}`, { method: "PUT", body: editModal.data });
      pushToast("success", "Account updated successfully");
      setEditModal({ open: false, data: null });
      await Promise.all([loadAccounts(), loadDetail(editModal.data._id)]);
    } catch (e) {
      pushToast("error", e.message || "Failed to update account");
    } finally {
      setSaving(false);
    }
  }

  async function onDeactivateAccount(id) {
    try {
      await apiFetch(`/accounts/${id}/deactivate`, { method: "PATCH" });
      pushToast("warning", "Account deactivated");
      await Promise.all([loadAccounts(), loadDetail(id)]);
    } catch (e) {
      pushToast("error", e.message || "Failed to deactivate account");
    }
  }

  async function onDeleteAccount(id) {
    if (!confirm("Delete this account and all transactions?")) return;
    try {
      await apiFetch(`/accounts/${id}`, { method: "DELETE" });
      pushToast("success", "Account deleted successfully");
      if (selectedAccountId === id) setSelectedAccountId(null);
      await loadAccounts();
    } catch (e) {
      pushToast("error", e.message || "Failed to delete account");
    }
  }

  async function onAddTransaction(e) {
    e.preventDefault();
    if (!selectedAccountId) return;
    setSaving(true);
    try {
      await apiFetch(`/accounts/${selectedAccountId}/transactions`, {
        method: "POST",
        body: { ...transactionForm, amount: Number(transactionForm.amount || 0) },
      });
      pushToast("success", `${transactionForm.type === "cash_in" ? "Cash In" : "Cash Out"} posted successfully`);
      setTransactionForm(newTransactionForm);
      await Promise.all([loadAccounts(), loadDetail(selectedAccountId)]);
    } catch (e2) {
      pushToast("error", e2.message || "Failed to add transaction");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminShell title="Account Management" user={null}>
      <ToastStack items={toasts} />
      <div className="space-y-5">
        <Panel title="Create Financial Account">
          <form onSubmit={onCreateAccount} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field required label="Account Name" value={form.accountName} onChange={(v) => setForm((s) => ({ ...s, accountName: v }))} />
            <Select label="Account Type" value={form.accountType} onChange={(v) => setForm((s) => ({ ...s, accountType: v }))} options={ACCOUNT_TYPES} />
            {form.accountType === "bank" && (
              <>
                <Select label="Bank Name" value={form.bankName} onChange={(v) => setForm((s) => ({ ...s, bankName: v }))} options={PAK_BANKS.map((bank) => [bank, bank])} />
                <Field label="Branch Name" value={form.branchName} onChange={(v) => setForm((s) => ({ ...s, branchName: v }))} />
                <Field label="Branch Code" value={form.branchCode} onChange={(v) => setForm((s) => ({ ...s, branchCode: v }))} />
                <Field required label="Account Title" value={form.accountTitle} onChange={(v) => setForm((s) => ({ ...s, accountTitle: v }))} />
                <Field required label="Account Number" value={form.accountNumber} onChange={(v) => setForm((s) => ({ ...s, accountNumber: v }))} />
                <Field required label="IBAN" value={form.iban} onChange={(v) => setForm((s) => ({ ...s, iban: v }))} />
                <Field label="Swift Code" value={form.swiftCode} onChange={(v) => setForm((s) => ({ ...s, swiftCode: v }))} />
              </>
            )}
            <Field required type="number" label="Opening Balance" value={form.openingBalance} onChange={(v) => setForm((s) => ({ ...s, openingBalance: v }))} />
            <Field required type="date" label="Opening Date" value={form.openingDate} onChange={(v) => setForm((s) => ({ ...s, openingDate: v }))} />
            <Field label="Currency" value={form.currency} onChange={(v) => setForm((s) => ({ ...s, currency: v }))} />
            <Select label="Status" value={form.status} onChange={(v) => setForm((s) => ({ ...s, status: v }))} options={[["active", "Active"], ["inactive", "Inactive"]]} />
            <div className="md:col-span-2">
              <Field label="Notes" value={form.notes} onChange={(v) => setForm((s) => ({ ...s, notes: v }))} />
            </div>
            <button disabled={saving} className="md:col-span-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 font-semibold disabled:opacity-70">{saving ? "Saving..." : "Save Account"}</button>
          </form>
        </Panel>

        <Panel title="Accounts List">
          <div className="overflow-auto rounded-xl border border-zinc-200">
            <table className="w-full min-w-[930px] text-sm">
              <thead className="bg-zinc-50 text-zinc-700"><tr><th className="px-3 py-2 text-left">Account Name</th><th className="px-3 py-2 text-left">Type</th><th className="px-3 py-2 text-left">Bank Name</th><th className="px-3 py-2 text-left">Account Number</th><th className="px-3 py-2 text-left">Current Balance</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-left">Action</th></tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={7} className="px-3 py-6">Loading...</td></tr> : accounts.map((row) => (
                  <tr key={row._id} className={`border-t ${selectedAccountId === row._id ? "bg-emerald-50/60" : "hover:bg-zinc-50"}`}>
                    <td className="px-3 py-2 font-medium">{row.accountName}</td>
                    <td className="px-3 py-2 capitalize">{row.accountType}</td>
                    <td className="px-3 py-2">{row.bankName || "-"}</td>
                    <td className="px-3 py-2">{row.accountNumberMasked || "-"}</td>
                    <td className="px-3 py-2 font-semibold">{row.currency} {Number(row.currentBalance || 0).toLocaleString()}</td>
                    <td className="px-3 py-2 capitalize">{row.status}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => setSelectedAccountId(row._id)} className="rounded-lg border border-blue-200 bg-blue-50 text-blue-700 px-3 py-1.5 text-xs font-semibold hover:bg-blue-100">View</button>
                        <button onClick={() => setEditModal({ open: true, data: { ...row } })} className="rounded-lg border border-amber-200 bg-amber-50 text-amber-700 px-3 py-1.5 text-xs font-semibold hover:bg-amber-100">Edit</button>
                        <button onClick={() => onDeactivateAccount(row._id)} className="rounded-lg border border-zinc-300 bg-zinc-100 text-zinc-700 px-3 py-1.5 text-xs font-semibold hover:bg-zinc-200">Deactivate</button>
                        <button onClick={() => onDeleteAccount(row._id)} className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-1.5 text-xs font-semibold hover:bg-red-100">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        {accountDetail?.account ? (
          <>
            <Panel title={`Account Detail — ${accountDetail.account.accountName}`}>
              <div className="grid md:grid-cols-3 gap-4">
                <Card title="Account Information">
                  <KV k="Bank Name" v={accountDetail.account.bankName || "-"} />
                  <KV k="Account Title" v={accountDetail.account.accountTitle || "-"} />
                  <KV k="Account Number" v={accountDetail.account.accountNumber || "-"} />
                  <KV k="IBAN" v={accountDetail.account.iban || "-"} />
                  <KV k="Opening Balance" v={`${accountDetail.account.currency} ${Number(accountDetail.account.openingBalance || 0).toLocaleString()}`} />
                  <KV k="Current Balance" v={`${accountDetail.account.currency} ${Number(accountDetail.account.currentBalance || 0).toLocaleString()}`} />
                </Card>
                <Card title="Daily / Monthly Summary">
                  <KV k="Total Cash In Today" v={Number(accountDetail.summaries.daily.cashIn || 0).toLocaleString()} />
                  <KV k="Total Cash Out Today" v={Number(accountDetail.summaries.daily.cashOut || 0).toLocaleString()} />
                  <KV k="Net Change Today" v={Number(accountDetail.summaries.daily.netChange || 0).toLocaleString()} />
                  <KV k="Total Cash In This Month" v={Number(accountDetail.summaries.monthly.cashIn || 0).toLocaleString()} />
                  <KV k="Total Cash Out This Month" v={Number(accountDetail.summaries.monthly.cashOut || 0).toLocaleString()} />
                  <KV k="Net Profit/Loss This Month" v={Number(accountDetail.summaries.monthly.netProfitLoss || 0).toLocaleString()} />
                </Card>
                <Card title="Top Expense Categories">
                  <KV k="Salary" v={Number(expenseSplit.salary || 0).toLocaleString()} />
                  <KV k="Supplier Payments" v={Number(expenseSplit.supplier_payment || 0).toLocaleString()} />
                  <KV k="Operational Expenses" v={Number(expenseSplit.expense || 0).toLocaleString()} />
                  <KV k="Logistics" v={Number(expenseSplit.logistics || 0).toLocaleString()} />
                </Card>
              </div>

              <form onSubmit={onAddTransaction} className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                <Select label="Transaction Type" value={transactionForm.type} onChange={(v) => setTransactionForm((s) => ({ ...s, type: v }))} options={[["cash_in", "Cash In"], ["cash_out", "Cash Out"]]} />
                <Field required type="number" label="Amount" value={transactionForm.amount} onChange={(v) => setTransactionForm((s) => ({ ...s, amount: v }))} />
                <Field required type="date" label="Transaction Date" value={transactionForm.transactionDate} onChange={(v) => setTransactionForm((s) => ({ ...s, transactionDate: v }))} />
                <Select label="Reference Type" value={transactionForm.referenceType} onChange={(v) => setTransactionForm((s) => ({ ...s, referenceType: v }))} options={REFERENCE_TYPES} />
                <Field label="Reference ID" value={transactionForm.referenceId} onChange={(v) => setTransactionForm((s) => ({ ...s, referenceId: v }))} />
                <Field label="Attachment URL" value={transactionForm.attachmentUrl} onChange={(v) => setTransactionForm((s) => ({ ...s, attachmentUrl: v }))} />
                <div className="md:col-span-3"><Field required label="Description" value={transactionForm.description} onChange={(v) => setTransactionForm((s) => ({ ...s, description: v }))} /></div>
                <button className="md:col-span-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white py-2.5 font-semibold">Post Transaction</button>
              </form>
            </Panel>

            <Panel title="Transaction Ledger (Cash In / Cash Out)">
              <div className="overflow-auto rounded-xl border border-zinc-200">
                <table className="w-full min-w-[980px] text-sm">
                  <thead className="bg-zinc-50"><tr><th className="px-3 py-2 text-left">Date & Time</th><th className="px-3 py-2 text-left">Type</th><th className="px-3 py-2 text-left">Amount</th><th className="px-3 py-2 text-left">Reference</th><th className="px-3 py-2 text-left">Description</th><th className="px-3 py-2 text-left">Attachment</th><th className="px-3 py-2 text-left">Receipt</th></tr></thead>
                  <tbody>
                    {transactions.length === 0 ? <tr><td colSpan={7} className="px-3 py-6 text-zinc-500">No transactions yet.</td></tr> : transactions.map((tx) => (
                      <tr key={tx._id} className="border-t hover:bg-zinc-50">
                        <td className="px-3 py-2">{new Date(tx.transactionDate).toLocaleString()}</td>
                        <td className="px-3 py-2"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${tx.type === "cash_in" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{tx.type === "cash_in" ? "Cash In" : "Cash Out"}</span></td>
                        <td className="px-3 py-2 font-semibold">{accountDetail.account.currency} {Number(tx.amount || 0).toLocaleString()}</td>
                        <td className="px-3 py-2 capitalize">{String(tx.referenceType || "-").replaceAll("_", " ")}{tx.referenceId ? ` (${tx.referenceId})` : ""}</td>
                        <td className="px-3 py-2">{tx.description || "-"}</td>
                        <td className="px-3 py-2">{tx.attachmentUrl ? <a className="text-blue-700 underline" href={tx.attachmentUrl} target="_blank">Open</a> : "-"}</td>
                        <td className="px-3 py-2"><button onClick={() => setReceiptTransaction(tx)} className="rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 px-3 py-1.5 text-xs font-semibold hover:bg-indigo-100">Receipt</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </>
        ) : null}
      </div>

      {editModal.open ? (
        <Modal title="Edit Account" onClose={() => setEditModal({ open: false, data: null })}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Account Name" value={editModal.data.accountName || ""} onChange={(v) => setEditModal((s) => ({ ...s, data: { ...s.data, accountName: v } }))} />
            <Select label="Account Type" value={editModal.data.accountType || "bank"} onChange={(v) => setEditModal((s) => ({ ...s, data: { ...s.data, accountType: v } }))} options={ACCOUNT_TYPES} />
            <Field label="Bank Name" value={editModal.data.bankName || ""} onChange={(v) => setEditModal((s) => ({ ...s, data: { ...s.data, bankName: v } }))} />
            <Field label="Branch Name" value={editModal.data.branchName || ""} onChange={(v) => setEditModal((s) => ({ ...s, data: { ...s.data, branchName: v } }))} />
            <Field label="Branch Code" value={editModal.data.branchCode || ""} onChange={(v) => setEditModal((s) => ({ ...s, data: { ...s.data, branchCode: v } }))} />
            <Field label="Account Title" value={editModal.data.accountTitle || ""} onChange={(v) => setEditModal((s) => ({ ...s, data: { ...s.data, accountTitle: v } }))} />
            <Field label="Account Number" value={editModal.data.accountNumber || ""} onChange={(v) => setEditModal((s) => ({ ...s, data: { ...s.data, accountNumber: v } }))} />
            <Field label="IBAN" value={editModal.data.iban || ""} onChange={(v) => setEditModal((s) => ({ ...s, data: { ...s.data, iban: v } }))} />
            <Field label="Swift Code" value={editModal.data.swiftCode || ""} onChange={(v) => setEditModal((s) => ({ ...s, data: { ...s.data, swiftCode: v } }))} />
            <Select label="Status" value={editModal.data.status || "active"} onChange={(v) => setEditModal((s) => ({ ...s, data: { ...s.data, status: v } }))} options={[["active", "Active"], ["inactive", "Inactive"]]} />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setEditModal({ open: false, data: null })} className="rounded-lg border px-4 py-2">Cancel</button>
            <button onClick={onUpdateAccount} className="rounded-lg bg-emerald-600 text-white px-4 py-2">Update</button>
          </div>
        </Modal>
      ) : null}

      {receiptTransaction ? (
        <Modal title="Transaction Receipt" onClose={() => setReceiptTransaction(null)}>
          <div className="rounded-xl border-2 border-dashed border-zinc-300 p-4 bg-zinc-50">
            <div className="text-center border-b pb-3 mb-3">
              <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">AIM Hygienics</div>
              <div className="text-lg font-bold mt-1">{receiptTransaction.type === "cash_in" ? "Cash In Transaction" : "Cash Out Transaction"}</div>
              <div className="text-xs text-zinc-500 mt-1">Generated: {new Date().toLocaleString()}</div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-sm">
              <ReceiptRow label="Account" value={accountDetail?.account?.accountName || "-"} />
              <ReceiptRow label="Bank" value={accountDetail?.account?.bankName || "-"} />
              <ReceiptRow label="Transaction ID" value={receiptTransaction._id} />
              <ReceiptRow label="Type" value={receiptTransaction.type === "cash_in" ? "Cash In" : "Cash Out"} />
              <ReceiptRow label="Amount" value={`${accountDetail?.account?.currency || "PKR"} ${Number(receiptTransaction.amount || 0).toLocaleString()}`} />
              <ReceiptRow label="Date & Time" value={new Date(receiptTransaction.transactionDate).toLocaleString()} />
              <ReceiptRow label="Reference Type" value={String(receiptTransaction.referenceType || "-").replaceAll("_", " ")} />
              <ReceiptRow label="Reference ID" value={receiptTransaction.referenceId || "-"} />
              <ReceiptRow label="Created At" value={new Date(receiptTransaction.createdAt).toLocaleString()} />
              <ReceiptRow label="Attachment" value={receiptTransaction.attachmentUrl ? "Attached" : "Not attached"} />
            </div>
            <div className="mt-3 border-t pt-3 text-sm">
              <div className="font-semibold mb-1">Description</div>
              <div className="text-zinc-700">{receiptTransaction.description || "-"}</div>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => window.print()} className="rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 px-4 py-2">Print Receipt</button>
            <button onClick={() => setReceiptTransaction(null)} className="rounded-lg border px-4 py-2">Close</button>
          </div>
        </Modal>
      ) : null}
    </AdminShell>
  );
}

function ToastStack({ items }) {
  return (
    <div className="fixed top-4 right-4 z-[70] space-y-2">
      {items.map((toast) => (
        <div
          key={toast.id}
          className={`min-w-[250px] rounded-xl border px-4 py-3 text-sm shadow-lg ${
            toast.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : toast.type === "warning"
                ? "bg-amber-50 border-amber-200 text-amber-700"
                : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}

function Panel({ title, children }) { return <div className="rounded-2xl bg-white border shadow-sm p-5"><div className="text-lg font-semibold mb-3">{title}</div>{children}</div>; }
function Card({ title, children }) { return <div className="rounded-xl border p-3"><div className="font-semibold mb-2">{title}</div>{children}</div>; }
function KV({ k, v }) { return <div className="flex items-start justify-between gap-4 py-1 border-b text-sm"><span className="text-zinc-600">{k}</span><span className="font-medium text-right">{v}</span></div>; }
function Field({ label, value, onChange, type = "text", required = false }) { return <label className="text-sm"><div className="mb-1 font-medium text-zinc-700">{label}</div><input required={required} type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-200"/></label>; }
function Select({ label, value, onChange, options }) { return <label className="text-sm"><div className="mb-1 font-medium text-zinc-700">{label}</div><select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-200">{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>; }
function Modal({ title, children, onClose }) { return <div className="fixed inset-0 z-[65]"><div className="absolute inset-0 bg-black/40" onClick={onClose} /><div className="absolute left-1/2 top-1/2 w-[95vw] max-w-4xl -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-5 shadow-2xl"><div className="flex items-center justify-between mb-3"><div className="text-lg font-semibold">{title}</div><button onClick={onClose} className="rounded-md border px-2 py-1 text-sm">✕</button></div>{children}</div></div>; }
function ReceiptRow({ label, value }) { return <div className="flex justify-between border-b py-1"><span className="text-zinc-600">{label}</span><span className="font-medium text-right">{value}</span></div>; }