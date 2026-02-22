"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminShell from "../../components/AdminShell";
import { apiFetch } from "../../../../lib/api";

const ACCOUNT_TYPE_OPTIONS = [
  ["bank", "Bank Account"],
  ["cash", "Cash Account"],
  ["easypaisa", "Easypaisa"],
  ["jazzcash", "JazzCash"],
  ["other", "Other"],
];

const REFERENCE_OPTIONS = [
  ["primary_payment", "Primary Payment"],
  ["secondary_payment", "Secondary Payment"],
  ["expense", "Expense"],
  ["salary", "Salary"],
  ["supplier_payment", "Supplier Payment"],
  ["manual_entry", "Manual Entry"],
  ["other", "Other"],
];

const BANKS = ["HBL", "UBL", "Meezan Bank", "Bank Alfalah", "MCB", "Allied Bank", "Askari Bank", "Faysal Bank", "Bank of Punjab", "Standard Chartered"];

const initialForm = {
  accountId: "",
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

const txInitial = {
  type: "cash_in",
  amount: "",
  transactionDate: new Date().toISOString().slice(0, 10),
  referenceType: "manual_entry",
  referenceId: "",
  description: "",
  attachmentUrl: "",
};

export default function AccountManagementPage() {
  const [rows, setRows] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [details, setDetails] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState(initialForm);
  const [txForm, setTxForm] = useState(txInitial);

  const loadAccounts = useCallback(async function loadAccounts() {
    setLoading(true);
    try {
      const res = await apiFetch("/accounts");
      const list = res.accounts || [];
      setRows(list);
      if (!selectedId && list.length) setSelectedId(list[0]._id);
    } catch (e) {
      setError(e.message || "Failed to load accounts");
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  const loadDetails = useCallback(async function loadDetails(id) {
    if (!id) return;
    try {
      const [d, t] = await Promise.all([apiFetch(`/accounts/${id}`), apiFetch(`/accounts/${id}/transactions`)]);
      setDetails(d);
      setTransactions(t.transactions || []);
    } catch (e) {
      setError(e.message || "Failed to load account detail");
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    loadDetails(selectedId);
  }, [selectedId, loadDetails]);

  const balanceTrend = useMemo(() => {
    let running = details?.account?.openingBalance || 0;
    const byDate = [...transactions].sort((a, b) => new Date(a.transactionDate) - new Date(b.transactionDate));
    return byDate.slice(-30).map((t) => {
      running += t.type === "cash_in" ? t.amount : -t.amount;
      return { date: new Date(t.transactionDate).toISOString().slice(5, 10), value: running };
    });
  }, [transactions, details]);

  const expenseBreakdown = useMemo(() => {
    const totals = { salary: 0, supplier_payment: 0, expense: 0, logistics: 0 };
    transactions.forEach((t) => {
      if (t.type !== "cash_out") return;
      if (t.referenceType in totals) totals[t.referenceType] += t.amount;
      else totals.logistics += t.amount;
    });
    return totals;
  }, [transactions]);

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await apiFetch("/accounts", { method: "POST", body: { ...form, openingBalance: Number(form.openingBalance || 0) } });
      setMessage("Account created successfully.");
      setForm(initialForm);
      await loadAccounts();
    } catch (e2) {
      setError(e2.message || "Failed to create account");
    } finally {
      setSaving(false);
    }
  }

  async function addTransaction(e) {
    e.preventDefault();
    if (!selectedId) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await apiFetch(`/accounts/${selectedId}/transactions`, {
        method: "POST",
        body: {
          ...txForm,
          amount: Number(txForm.amount || 0),
        },
      });
      setMessage("Transaction posted.");
      setTxForm(txInitial);
      await Promise.all([loadAccounts(), loadDetails(selectedId)]);
    } catch (e2) {
      setError(e2.message || "Failed to add transaction");
    } finally {
      setSaving(false);
    }
  }

  async function deactivate(id) {
    try {
      await apiFetch(`/accounts/${id}/deactivate`, { method: "PATCH" });
      await loadAccounts();
      if (selectedId === id) await loadDetails(id);
    } catch (e) {
      setError(e.message || "Failed to deactivate account");
    }
  }

  return (
    <AdminShell title="Account Management" user={null}>
      <div className="space-y-5">
        <Panel title="Create Account">
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Account Name" required value={form.accountName} onChange={(v) => setForm((s) => ({ ...s, accountName: v }))} />
            <Select label="Account Type" value={form.accountType} onChange={(v) => setForm((s) => ({ ...s, accountType: v }))} options={ACCOUNT_TYPE_OPTIONS} />
            {form.accountType === "bank" ? (
              <>
                <Select label="Bank Name" value={form.bankName} onChange={(v) => setForm((s) => ({ ...s, bankName: v }))} options={BANKS.map((b) => [b, b])} />
                <Field label="Branch Name" value={form.branchName} onChange={(v) => setForm((s) => ({ ...s, branchName: v }))} />
                <Field label="Branch Code" value={form.branchCode} onChange={(v) => setForm((s) => ({ ...s, branchCode: v }))} />
                <Field required label="Account Title" value={form.accountTitle} onChange={(v) => setForm((s) => ({ ...s, accountTitle: v }))} />
                <Field required label="Account Number" value={form.accountNumber} onChange={(v) => setForm((s) => ({ ...s, accountNumber: v }))} />
                <Field required label="IBAN" value={form.iban} onChange={(v) => setForm((s) => ({ ...s, iban: v }))} />
                <Field label="Swift Code" value={form.swiftCode} onChange={(v) => setForm((s) => ({ ...s, swiftCode: v }))} />
              </>
            ) : null}
            <Field type="number" required label="Opening Balance" value={form.openingBalance} onChange={(v) => setForm((s) => ({ ...s, openingBalance: v }))} />
            <Field type="date" required label="Opening Date" value={form.openingDate} onChange={(v) => setForm((s) => ({ ...s, openingDate: v }))} />
            <Field label="Currency" value={form.currency} onChange={(v) => setForm((s) => ({ ...s, currency: v }))} />
            <Select label="Status" value={form.status} onChange={(v) => setForm((s) => ({ ...s, status: v }))} options={[["active", "Active"], ["inactive", "Inactive"]]} />
            <div className="md:col-span-2">
              <Field label="Notes" value={form.notes} onChange={(v) => setForm((s) => ({ ...s, notes: v }))} />
            </div>
            <button className="md:col-span-2 rounded-lg px-4 py-2 bg-emerald-600 text-white">{saving ? "Saving..." : "Save Account"}</button>
          </form>
        </Panel>

        {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700 text-sm">{error}</div> : null}
        {message ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700 text-sm">{message}</div> : null}

        <Panel title="Accounts List">
          <div className="overflow-auto rounded-xl border">
            <table className="w-full min-w-[840px] text-sm">
              <thead className="bg-zinc-50"><tr><th className="p-2 text-left">Account Name</th><th className="p-2 text-left">Type</th><th className="p-2 text-left">Bank</th><th className="p-2 text-left">Account Number</th><th className="p-2 text-left">Current Balance</th><th className="p-2 text-left">Status</th><th className="p-2 text-left">Action</th></tr></thead>
              <tbody>
                {loading ? <tr><td className="p-4" colSpan={7}>Loading...</td></tr> : rows.map((r) => (
                  <tr key={r._id} className={selectedId === r._id ? "bg-emerald-50" : ""}>
                    <td className="p-2">{r.accountName}</td><td className="p-2 capitalize">{r.accountType}</td><td className="p-2">{r.bankName || "-"}</td><td className="p-2">{r.accountNumberMasked || "-"}</td><td className="p-2 font-semibold">{r.currency} {Number(r.currentBalance || 0).toLocaleString()}</td><td className="p-2">{r.status}</td>
                    <td className="p-2 space-x-2"><button className="underline" onClick={() => setSelectedId(r._id)}>View</button><button className="underline" onClick={() => setSelectedId(r._id)}>Edit</button><button className="underline text-red-600" onClick={() => deactivate(r._id)}>Deactivate</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        {details?.account ? (
          <Panel title={`Account Detail — ${details.account.accountName}`}>
            <div className="grid md:grid-cols-3 gap-4">
              <Card title="Account Information">
                <KV k="Bank Name" v={details.account.bankName || "-"} />
                <KV k="Account Title" v={details.account.accountTitle || "-"} />
                <KV k="Account Number" v={details.account.accountNumber || "-"} />
                <KV k="IBAN" v={details.account.iban || "-"} />
                <KV k="Opening Balance" v={`${details.account.currency} ${Number(details.account.openingBalance || 0).toLocaleString()}`} />
                <KV k="Current Balance" v={`${details.account.currency} ${Number(details.account.currentBalance || 0).toLocaleString()}`} />
              </Card>
              <Card title="Daily / Monthly Summary">
                <KV k="Cash In Today" v={Number(details.summaries.daily.cashIn).toLocaleString()} />
                <KV k="Cash Out Today" v={Number(details.summaries.daily.cashOut).toLocaleString()} />
                <KV k="Net Change Today" v={Number(details.summaries.daily.netChange).toLocaleString()} />
                <KV k="Cash In This Month" v={Number(details.summaries.monthly.cashIn).toLocaleString()} />
                <KV k="Cash Out This Month" v={Number(details.summaries.monthly.cashOut).toLocaleString()} />
                <KV k="Net P/L This Month" v={Number(details.summaries.monthly.netProfitLoss).toLocaleString()} />
              </Card>
              <Card title="Insights">
                <KV k="Balance Health" v={health(details.account.currentBalance)} />
                <KV k="Average Daily Inflow" v={avg(transactions, "cash_in")} />
                <KV k="Average Daily Outflow" v={avg(transactions, "cash_out")} />
                <KV k="Largest Transaction" v={details.metrics.largestTransaction ? `${details.metrics.largestTransaction.type} ${details.metrics.largestTransaction.amount}` : "-"} />
                <KV k="Transaction Count" v={details.metrics.totalTransactionsCount} />
              </Card>
            </div>

            <div className="mt-4 grid md:grid-cols-2 gap-4">
              <Card title="Cash Flow Trend (Last 30 entries)">
                <MiniBars points={balanceTrend} />
              </Card>
              <Card title="Top Expense Categories">
                <KV k="Salary" v={expenseBreakdown.salary.toLocaleString()} />
                <KV k="Supplier Payments" v={expenseBreakdown.supplier_payment.toLocaleString()} />
                <KV k="Operational Expenses" v={expenseBreakdown.expense.toLocaleString()} />
                <KV k="Logistics" v={expenseBreakdown.logistics.toLocaleString()} />
              </Card>
            </div>

            <form onSubmit={addTransaction} className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
              <Select label="Transaction Type" value={txForm.type} onChange={(v) => setTxForm((s) => ({ ...s, type: v }))} options={[["cash_in", "Cash In"], ["cash_out", "Cash Out"]]} />
              <Field required type="number" label="Amount" value={txForm.amount} onChange={(v) => setTxForm((s) => ({ ...s, amount: v }))} />
              <Field required type="date" label="Transaction Date" value={txForm.transactionDate} onChange={(v) => setTxForm((s) => ({ ...s, transactionDate: v }))} />
              <Select label="Reference Type" value={txForm.referenceType} onChange={(v) => setTxForm((s) => ({ ...s, referenceType: v }))} options={REFERENCE_OPTIONS} />
              <Field label="Reference ID" value={txForm.referenceId} onChange={(v) => setTxForm((s) => ({ ...s, referenceId: v }))} />
              <Field label="Attachment URL" value={txForm.attachmentUrl} onChange={(v) => setTxForm((s) => ({ ...s, attachmentUrl: v }))} />
              <div className="md:col-span-3"><Field required label="Description" value={txForm.description} onChange={(v) => setTxForm((s) => ({ ...s, description: v }))} /></div>
              <button className="md:col-span-3 rounded-lg px-4 py-2 bg-zinc-900 text-white">Post Transaction</button>
            </form>
          </Panel>
        ) : null}
      </div>
    </AdminShell>
  );
}

function Panel({ title, children }) { return <div className="rounded-2xl bg-white border shadow-sm p-5"><h2 className="font-semibold mb-3">{title}</h2>{children}</div>; }
function Card({ title, children }) { return <div className="rounded-xl border p-3"><div className="font-semibold mb-2">{title}</div>{children}</div>; }
function KV({ k, v }) { return <div className="flex justify-between text-sm py-1 border-b"><span className="text-zinc-600">{k}</span><span className="font-medium text-right">{v}</span></div>; }
function Field({ label, value, onChange, type = "text", required = false }) { return <label className="text-sm"><div className="mb-1">{label}</div><input required={required} type={type} value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border px-3 py-2"/></label>; }
function Select({ label, value, onChange, options }) { return <label className="text-sm"><div className="mb-1">{label}</div><select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border px-3 py-2">{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>; }
function health(balance = 0) { if (balance > 1000000) return "Healthy (Green)"; if (balance >= 200000) return "Moderate (Yellow)"; return "Low Liquidity (Red)"; }
function avg(transactions = [], type) { const filtered = transactions.filter((t) => t.type === type); if (!filtered.length) return "0"; const days = new Set(filtered.map((t) => new Date(t.transactionDate).toISOString().slice(0, 10))).size || 1; return (filtered.reduce((a, b) => a + b.amount, 0) / days).toFixed(2); }
function MiniBars({ points = [] }) {
  const max = Math.max(...points.map((p) => p.value), 1);
  return <div className="flex items-end gap-1 h-20">{points.map((p) => <div key={`${p.date}-${p.value}`} title={`${p.date}: ${p.value}`} className="bg-emerald-500/70 w-2" style={{ height: `${Math.max((p.value / max) * 100, 4)}%` }} />)}</div>;
}
