"use client";

import { useEffect, useMemo, useState } from "react";
import financeService from "../../../services/financeService";

const TABS = [
  ["overview", "Overview"],
  ["chart", "Chart of Accounts"],
  ["journal", "Journal Entries"],
  ["reports", "Financial Reports"],
  ["receivables", "Receivables"],
  ["payables", "Payables"],
  ["accounts", "Cash / Bank"],
  ["ledger", "Cashbook"],
];
const emptyChart = { code: "", name: "", type: "asset", openingBalance: 0, notes: "" };
const emptyAccount = { accountName: "", accountType: "cash", openingBalance: 0, accountNumber: "", notes: "" };
const emptyTransaction = { accountId: "", type: "cash_in", amount: 0, description: "", referenceId: "" };
const defaultJournalLines = [{ accountCode: "", debit: 0, credit: 0, narration: "" }, { accountCode: "", debit: 0, credit: 0, narration: "" }];
const emptyJournal = { entryDate: new Date().toISOString().slice(0, 10), memo: "", status: "draft", lines: defaultJournalLines };

function money(value) { return `PKR ${Number(value || 0).toLocaleString()}`; }
function num(value) { return Number(value || 0).toLocaleString(); }
function dateText(value) { return value ? new Date(value).toLocaleDateString() : "-"; }
function status(status) {
  const s = String(status || "open");
  const cls = s === "paid" || s === "posted" || s === "active" || s === "completed"
    ? "bg-emerald-50 text-emerald-700"
    : s === "partial" ? "bg-blue-50 text-blue-700"
      : s === "pending" || s === "draft" ? "bg-amber-50 text-amber-700"
        : "bg-slate-100 text-slate-700";
  return <span className={`rounded-full px-3 py-1 text-xs font-black ${cls}`}>{s}</span>;
}
function readList(payload, key) { return Array.isArray(payload?.[key]) ? payload[key] : []; }
function exportCsv(filename, rows = []) {
  const headers = Object.keys(rows[0] || { empty: "" });
  const csv = [headers.join(","), ...rows.map((row) => headers.map((h) => `"${String(row[h] ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
}
function printPage() { if (typeof window !== "undefined") window.print(); }

function Kpi({ label, value, help }) {
  return <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
    <p className="mt-3 text-2xl font-black text-slate-950">{value}</p>
    <p className="mt-2 text-sm text-slate-500">{help}</p>
  </div>;
}
function Field({ label, children }) { return <label className="grid gap-1 text-xs font-bold uppercase tracking-wide text-slate-500"><span>{label}</span>{children}</label>; }
function inputClass() { return "rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-cyan-400"; }
function Panel({ title, subtitle, actions, children }) { return <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><h3 className="text-lg font-black text-slate-950">{title}</h3>{subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}</div>{actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}</div>{children}</div>; }
function Table({ title, rows = [], columns = [], render, actions }) {
  return <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
    <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
      <div><h3 className="font-black text-slate-950">{title}</h3><p className="text-xs text-slate-500">{rows.length} records</p></div>
      <div className="flex flex-wrap gap-2">{actions}<button onClick={() => exportCsv(`${title.toLowerCase().replace(/\s+/g, "-")}.csv`, rows)} className="rounded-full border border-slate-200 px-3 py-2 text-xs font-black text-slate-600">Export CSV</button><button onClick={printPage} className="rounded-full border border-slate-200 px-3 py-2 text-xs font-black text-slate-600">Print</button></div>
    </div>
    <div className="overflow-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{columns.map((c) => <th key={c} className="px-4 py-3">{c}</th>)}</tr></thead><tbody>{rows.map((row, idx) => <tr key={row._id || row.documentNo || `${title}-${idx}`} className="border-t border-slate-100">{render(row).map((cell, i) => <td key={i} className="px-4 py-3 align-middle text-slate-700">{cell}</td>)}</tr>)}{!rows.length ? <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-slate-400">No records yet.</td></tr> : null}</tbody></table></div>
  </div>;
}

export default function FinanceFoundationPage({ mode = "finance" }) {
  const [tab, setTab] = useState(mode === "receipts" ? "receivables" : mode === "payments" ? "payables" : "overview");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [data, setData] = useState({ kpis: {}, reports: {}, chartAccounts: [], journalEntries: [], accounts: [], transactions: [], distributorInvoices: [], distributorReceipts: [], customerInvoices: [], customerReceipts: [], supplierInvoices: [], supplierPayments: [], expenses: [], loans: [] });
  const [chartForm, setChartForm] = useState(emptyChart);
  const [accountForm, setAccountForm] = useState(emptyAccount);
  const [transactionForm, setTransactionForm] = useState(emptyTransaction);
  const [journalForm, setJournalForm] = useState(emptyJournal);

  async function load() { setLoading(true); setError(""); try { setData(await financeService.overview()); } catch (e) { setError(e.message || "Unable to load finance data"); } finally { setLoading(false); } }
  useEffect(() => { load(); }, []);
  async function action(label, fn) { setSaving(true); setError(""); setNotice(""); try { const res = await fn(); setNotice(res?.message || `${label} completed successfully.`); await load(); return res; } catch (e) { setError(e.message || `${label} failed`); } finally { setSaving(false); } }
  const chartAccounts = readList(data, "chartAccounts");
  const reportData = data.reports || {};

  function setJournalLine(index, patch) { setJournalForm((prev) => ({ ...prev, lines: prev.lines.map((line, i) => i === index ? { ...line, ...patch } : line) })); }
  function addJournalLine() { setJournalForm((prev) => ({ ...prev, lines: [...prev.lines, { accountCode: "", debit: 0, credit: 0, narration: "" }] })); }
  function removeJournalLine(index) { setJournalForm((prev) => ({ ...prev, lines: prev.lines.filter((_, i) => i !== index) })); }
  const journalTotals = useMemo(() => ({ debit: journalForm.lines.reduce((s, l) => s + Number(l.debit || 0), 0), credit: journalForm.lines.reduce((s, l) => s + Number(l.credit || 0), 0) }), [journalForm.lines]);

  return <div className="space-y-6 print:bg-white">
    <div className="rounded-[2rem] bg-gradient-to-r from-slate-950 via-emerald-700 to-cyan-500 p-6 text-white shadow-lg print:bg-white print:text-slate-950">
      <p className="text-xs font-black uppercase tracking-[0.35em] text-cyan-100 print:text-slate-500">Phase 5 Finance</p>
      <h2 className="mt-2 text-3xl font-black">Finance, Accounting, Cashbook & Reports</h2>
      <p className="mt-2 max-w-4xl text-sm text-cyan-50 print:text-slate-600">Rawyan ERP now includes core accounting foundations: chart of accounts, journal vouchers, trial balance, profit/loss, balance sheet, receivable/payable aging, account ledger, invoice receipts, payment posting, and print/export actions.</p>
    </div>

    <div className="flex flex-wrap gap-2 print:hidden">{TABS.map(([key, label]) => <button key={key} onClick={() => setTab(key)} className={`rounded-full px-4 py-2 text-sm font-bold ${tab === key ? "bg-slate-950 text-white" : "bg-white text-slate-600 shadow-sm ring-1 ring-slate-200"}`}>{label}</button>)}</div>
    {error ? <div className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-600">{error}</div> : null}
    {notice ? <div className="rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{notice}</div> : null}
    {loading ? <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-500 shadow-sm">Loading finance data…</div> : null}

    {!loading && tab === "overview" ? <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Cash / Bank" value={money(data.kpis?.accountBalance)} help="Tracked live account balance" />
        <Kpi label="Receivable" value={money((data.kpis?.primaryReceivable || 0) + (data.kpis?.customerReceivable || 0))} help="Distributor + customer balances" />
        <Kpi label="Supplier Payable" value={money(data.kpis?.supplierPayable)} help="Open supplier invoice balance" />
        <Kpi label="Net Profit" value={money(data.kpis?.netProfit)} help="From posted journal entries" />
        <Kpi label="Chart Accounts" value={num(data.kpis?.chartAccounts)} help="System and custom ledger heads" />
        <Kpi label="Posted Journals" value={num(data.kpis?.postedJournalEntries)} help="Accounting vouchers posted" />
        <Kpi label="Cash In" value={money(data.kpis?.cashIn)} help="Cashbook debit inflows" />
        <Kpi label="Cash Out" value={money(data.kpis?.cashOut)} help="Cashbook credit outflows" />
      </div>
      <div className="grid gap-5 xl:grid-cols-2"><Table title="Recent Journal Entries" rows={data.journalEntries?.slice(0, 8)} columns={["Voucher", "Date", "Memo", "Debit", "Credit", "Status"]} render={(row) => [row.documentNo, dateText(row.entryDate), row.memo || "-", money(row.totalDebit), money(row.totalCredit), status(row.status)]} /><Table title="Recent Cashbook" rows={data.transactions?.slice(0, 8)} columns={["Date", "Account", "Type", "Amount", "Description"]} render={(row) => [dateText(row.transactionDate), row.accountId?.accountName || row.accountId || "-", row.type, money(row.amount), row.description || "-"]} /></div>
    </div> : null}

    {!loading && tab === "chart" ? <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
      <Panel title="Create Chart Account" subtitle="Add custom accounting heads for Rawyan ERP reports."><div className="grid gap-3"><Field label="Code"><input value={chartForm.code} onChange={(e) => setChartForm((p) => ({ ...p, code: e.target.value }))} className={inputClass()} placeholder="e.g. 1150" /></Field><Field label="Name"><input value={chartForm.name} onChange={(e) => setChartForm((p) => ({ ...p, name: e.target.value }))} className={inputClass()} placeholder="Account name" /></Field><Field label="Type"><select value={chartForm.type} onChange={(e) => setChartForm((p) => ({ ...p, type: e.target.value }))} className={inputClass()}><option value="asset">Asset</option><option value="liability">Liability</option><option value="equity">Equity</option><option value="income">Income</option><option value="expense">Expense</option></select></Field><Field label="Opening Balance"><input value={chartForm.openingBalance} onChange={(e) => setChartForm((p) => ({ ...p, openingBalance: e.target.value }))} type="number" className={inputClass()} /></Field><Field label="Notes"><textarea value={chartForm.notes} onChange={(e) => setChartForm((p) => ({ ...p, notes: e.target.value }))} className={`${inputClass()} min-h-24`} /></Field><button disabled={saving} onClick={() => action("Chart account", () => financeService.createChartAccount(chartForm)).then(() => setChartForm(emptyChart))} className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white">Create Account Head</button></div></Panel>
      <Table title="Chart of Accounts" rows={chartAccounts} columns={["Code", "Name", "Type", "Opening", "Normal", "Status", "Action"]} render={(row) => [row.code, row.name, row.type, money(row.openingBalance), row.normalBalance, status(row.status), <button key="d" disabled={saving} onClick={() => action("Deactivate account", () => financeService.deleteChartAccount(row._id))} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">Deactivate</button>]} />
    </div> : null}

    {!loading && tab === "journal" ? <div className="space-y-5">
      <Panel title="Create Journal Voucher" subtitle="Debit and credit totals must match before posting."><div className="grid gap-3 lg:grid-cols-3"><Field label="Entry Date"><input value={journalForm.entryDate} onChange={(e) => setJournalForm((p) => ({ ...p, entryDate: e.target.value }))} type="date" className={inputClass()} /></Field><Field label="Status"><select value={journalForm.status} onChange={(e) => setJournalForm((p) => ({ ...p, status: e.target.value }))} className={inputClass()}><option value="draft">Draft</option><option value="posted">Post Immediately</option></select></Field><Field label="Memo"><input value={journalForm.memo} onChange={(e) => setJournalForm((p) => ({ ...p, memo: e.target.value }))} className={inputClass()} placeholder="Voucher memo" /></Field></div><div className="mt-4 space-y-3">{journalForm.lines.map((line, index) => <div key={index} className="grid gap-2 rounded-2xl bg-slate-50 p-3 md:grid-cols-[1.5fr_1fr_1fr_1.5fr_auto]"><select value={line.accountCode} onChange={(e) => setJournalLine(index, { accountCode: e.target.value })} className={inputClass()}><option value="">Select account</option>{chartAccounts.map((a) => <option key={a.code} value={a.code}>{a.code} - {a.name}</option>)}</select><input value={line.debit} onChange={(e) => setJournalLine(index, { debit: e.target.value, credit: 0 })} type="number" placeholder="Debit" className={inputClass()} /><input value={line.credit} onChange={(e) => setJournalLine(index, { credit: e.target.value, debit: 0 })} type="number" placeholder="Credit" className={inputClass()} /><input value={line.narration} onChange={(e) => setJournalLine(index, { narration: e.target.value })} placeholder="Narration" className={inputClass()} /><button onClick={() => removeJournalLine(index)} className="rounded-2xl bg-white px-3 text-xs font-black text-red-500 ring-1 ring-slate-200">Remove</button></div>)}</div><div className="mt-4 flex flex-wrap items-center gap-3"><button onClick={addJournalLine} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-black text-slate-700">Add Line</button><span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-700">Debit: {money(journalTotals.debit)}</span><span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-700">Credit: {money(journalTotals.credit)}</span><button disabled={saving} onClick={() => action("Journal voucher", () => financeService.createJournalEntry(journalForm)).then(() => setJournalForm(emptyJournal))} className="rounded-full bg-slate-950 px-5 py-2 text-sm font-black text-white">Save Voucher</button></div></Panel>
      <Table title="Journal Entries" rows={data.journalEntries} columns={["Voucher", "Date", "Memo", "Debit", "Credit", "Status", "Action"]} render={(row) => [row.documentNo, dateText(row.entryDate), row.memo || "-", money(row.totalDebit), money(row.totalCredit), status(row.status), row.status === "draft" ? <button key="p" onClick={() => action("Post journal", () => financeService.postJournalEntry(row._id))} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">Post</button> : <button key="r" onClick={() => action("Reverse journal", () => financeService.reverseJournalEntry(row._id))} className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">Reverse</button>]} />
    </div> : null}

    {!loading && tab === "reports" ? <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><Kpi label="Trial Difference" value={money(reportData.trialBalance?.totals?.difference)} help="Should be zero after balanced posting" /><Kpi label="Total Income" value={money(reportData.profitLoss?.totalIncome)} help="Posted income accounts" /><Kpi label="Total Expenses" value={money(reportData.profitLoss?.totalExpenses)} help="Posted expense accounts" /><Kpi label="Assets" value={money(reportData.balanceSheet?.totals?.assets)} help="Balance sheet assets" /></div>
      <Table title="Trial Balance" rows={reportData.trialBalance?.rows || []} columns={["Code", "Account", "Type", "Debit", "Credit", "Balance"]} render={(row) => [row.code, row.name, row.type, money(row.debit), money(row.credit), money(row.balance)]} />
      <div className="grid gap-5 xl:grid-cols-2"><Table title="Profit & Loss - Income" rows={reportData.profitLoss?.income || []} columns={["Code", "Account", "Amount"]} render={(row) => [row.code, row.name, money(row.amount)]} /><Table title="Profit & Loss - Expenses" rows={reportData.profitLoss?.expenses || []} columns={["Code", "Account", "Amount"]} render={(row) => [row.code, row.name, money(row.amount)]} /></div>
      <div className="grid gap-5 xl:grid-cols-2"><Table title="Receivable Aging" rows={[reportData.aging?.receivables || {}]} columns={["Current", "31-60", "61-90", "90+", "Total"]} render={(row) => [money(row.current), money(row.d31_60), money(row.d61_90), money(row.over90), money(row.total)]} /><Table title="Payable Aging" rows={[reportData.aging?.payables || {}]} columns={["Current", "31-60", "61-90", "90+", "Total"]} render={(row) => [money(row.current), money(row.d31_60), money(row.d61_90), money(row.over90), money(row.total)]} /></div>
    </div> : null}

    {!loading && tab === "receivables" ? <div className="space-y-5"><div className="grid gap-5 xl:grid-cols-2"><Table title="Distributor Invoices" rows={data.distributorInvoices} columns={["Invoice", "Distributor", "Total", "Balance", "Status", "Action"]} render={(row) => [row.documentNo, row.distributor?.partyName || "-", money(row.invoiceTotal), money(row.balanceAmount), status(row.paymentStatus), Number(row.balanceAmount || 0) > 0 ? <button key="r" disabled={saving} onClick={() => action("Distributor receipt", () => financeService.receiveDistributorInvoice(row._id, { amount: row.balanceAmount, paymentMethod: "cash" }))} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Receive</button> : <button key="print" onClick={printPage} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">Print</button>]} /><Table title="Customer Invoices" rows={data.customerInvoices} columns={["Invoice", "Customer", "Total", "Balance", "Status", "Action"]} render={(row) => [row.documentNo, row.customer?.partyName || "-", money(row.invoiceTotal), money(row.balanceAmount), status(row.paymentStatus), Number(row.balanceAmount || 0) > 0 ? <button key="cr" disabled={saving} onClick={() => action("Customer receipt", () => financeService.receiveCustomerInvoice(row._id, { amount: row.balanceAmount, paymentMethod: "cash" }))} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Receive</button> : <button key="print" onClick={printPage} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">Print</button>]} /></div><div className="grid gap-5 xl:grid-cols-2"><Table title="Distributor Receipts" rows={data.distributorReceipts} columns={["Receipt", "Distributor", "Amount", "Method", "Status"]} render={(row) => [row.documentNo, row.payer?.partyName || row.distributorId || "-", money(row.amount), row.paymentMethod || "-", status(row.status)]} /><Table title="Customer Receipts" rows={data.customerReceipts} columns={["Receipt", "Customer", "Amount", "Method", "Status"]} render={(row) => [row.documentNo, row.customer?.partyName || "-", money(row.amount), row.paymentMethod || "-", status(row.status)]} /></div></div> : null}

    {!loading && tab === "payables" ? <div className="grid gap-5 xl:grid-cols-2"><Table title="Supplier Invoices" rows={data.supplierInvoices} columns={["Invoice", "Supplier", "Total", "Balance", "Status", "Action"]} render={(row) => [row.documentNo, row.supplier?.partyName || "-", money(row.invoiceTotal), money(row.balanceAmount), status(row.paymentStatus), Number(row.balanceAmount || 0) > 0 ? <button key="p" disabled={saving} onClick={() => action("Supplier payment", () => financeService.paySupplierInvoice(row._id, { amount: row.balanceAmount, paymentMethod: "cash" }))} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">Pay</button> : <button key="print" onClick={printPage} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">Print</button>]} /><Table title="Supplier Payments" rows={data.supplierPayments} columns={["Payment", "Supplier", "Amount", "Method", "Status"]} render={(row) => [row.documentNo, row.supplier?.partyName || "-", money(row.amount), row.paymentMethod || "-", status(row.status)]} /></div> : null}

    {!loading && tab === "accounts" ? <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]"><Panel title="Create Cash / Bank Account"><div className="grid gap-3"><input value={accountForm.accountName} onChange={(e) => setAccountForm((p) => ({ ...p, accountName: e.target.value }))} placeholder="Account name" className={inputClass()} /><select value={accountForm.accountType} onChange={(e) => setAccountForm((p) => ({ ...p, accountType: e.target.value }))} className={inputClass()}><option value="cash">Cash</option><option value="bank">Bank</option><option value="easypaisa">Easypaisa</option><option value="jazzcash">JazzCash</option><option value="other">Other</option></select><input value={accountForm.accountNumber} onChange={(e) => setAccountForm((p) => ({ ...p, accountNumber: e.target.value }))} placeholder="Account number" className={inputClass()} /><input value={accountForm.openingBalance} onChange={(e) => setAccountForm((p) => ({ ...p, openingBalance: e.target.value }))} placeholder="Opening balance" type="number" className={inputClass()} /><button onClick={() => action("Account creation", () => financeService.createAccount(accountForm)).then(() => setAccountForm(emptyAccount))} disabled={saving} className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white">Create Account</button></div></Panel><Table title="Cash / Bank Accounts" rows={data.accounts} columns={["Account", "Type", "Balance", "Status"]} render={(row) => [row.accountName || row.accountId, row.accountType || "-", money(row.currentBalance || row.openingBalance), status(row.status || "active")]} /></div> : null}

    {!loading && tab === "ledger" ? <div className="space-y-5"><Panel title="Manual Cashbook Entry" subtitle="Use for owner cash injection, bank charges, or non-invoice cash movement."><div className="grid gap-3 lg:grid-cols-5"><select value={transactionForm.accountId} onChange={(e) => setTransactionForm((p) => ({ ...p, accountId: e.target.value }))} className={inputClass()}><option value="">Select account</option>{data.accounts.map((a) => <option key={a._id} value={a._id}>{a.accountName}</option>)}</select><select value={transactionForm.type} onChange={(e) => setTransactionForm((p) => ({ ...p, type: e.target.value }))} className={inputClass()}><option value="cash_in">Cash In</option><option value="cash_out">Cash Out</option></select><input value={transactionForm.amount} onChange={(e) => setTransactionForm((p) => ({ ...p, amount: e.target.value }))} type="number" placeholder="Amount" className={inputClass()} /><input value={transactionForm.description} onChange={(e) => setTransactionForm((p) => ({ ...p, description: e.target.value }))} placeholder="Description" className={inputClass()} /><button disabled={saving} onClick={() => action("Cashbook transaction", () => financeService.createTransaction(transactionForm)).then(() => setTransactionForm(emptyTransaction))} className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white">Post Entry</button></div></Panel><Table title="Account Ledger / Cashbook" rows={data.transactions} columns={["Date", "Account", "Type", "Amount", "Reference", "Description"]} render={(row) => [dateText(row.transactionDate), row.accountId?.accountName || row.accountId || "-", row.type, money(row.amount), row.referenceType || "-", row.description || "-"]} /></div> : null}
  </div>;
}
