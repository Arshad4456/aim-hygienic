"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import UserDashboardShell from "../../components/userDashboardShell";
import { userDashboardSearchItems } from "../../searchItems";
import { v2Api } from "../../../lib/api";
import PageHeader from "../../../components/foundation/PageHeader";
import SectionCard from "../../../components/foundation/SectionCard";
import ModuleCardStrip from "../../../components/foundation/ModuleCardStrip";
import DocumentTable from "../../../components/foundation/DocumentTable";
import EmptyState from "../../../components/foundation/EmptyState";
import StatusBadge from "../../../components/foundation/StatusBadge";

const SECTION_ITEMS = [
  { key: "overview", title: "Accounts overview", description: "Receipts, outstanding, payables, cash/bank, and distributor P&L in one finance command center." },
  { key: "customer-invoices", title: "Customer invoices", description: "Customer billing and open invoice posture for distributor-side sales." },
  { key: "customer-receipts", title: "Customer receipts", description: "Collections, allocation visibility, and recent receipt activity." },
  { key: "aging", title: "Aging & outstanding", description: "Customer outstanding buckets and collection pressure." },
  { key: "payable-company", title: "Payable to company", description: "Open company invoices and settlement pressure back to company supply." },
  { key: "expenses", title: "Expense & P&L", description: "Expense posting visibility, cash/bank snapshot, and distributor P&L estimate." },
];

function safeNumber(value) {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatCurrency(value) {
  return `PKR ${safeNumber(value).toLocaleString()}`;
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function normalizeRows(response, key) {
  return Array.isArray(response?.[key]) ? response[key] : [];
}

function normalizeExpenses(response) {
  if (Array.isArray(response?.expenses)) return response.expenses;
  if (Array.isArray(response)) return response;
  return [];
}

function computeAgingBuckets(invoices = []) {
  const today = new Date();
  const buckets = { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90_plus: 0, total: 0 };

  for (const invoice of Array.isArray(invoices) ? invoices : []) {
    const remaining = safeNumber(invoice?.balanceAmount || invoice?.invoiceTotal || invoice?.totals?.grandTotal);
    if (remaining <= 0) continue;
    buckets.total += remaining;
    const dueDate = new Date(invoice?.dueDate || invoice?.invoiceDate || invoice?.createdAt || today);
    const days = Math.floor((today.getTime() - dueDate.getTime()) / 86400000);
    if (days <= 0) buckets.current += remaining;
    else if (days <= 30) buckets.d1_30 += remaining;
    else if (days <= 60) buckets.d31_60 += remaining;
    else if (days <= 90) buckets.d61_90 += remaining;
    else buckets.d90_plus += remaining;
  }

  return buckets;
}

function recentRows(rows = [], limit = 8) {
  return [...(Array.isArray(rows) ? rows : [])]
    .sort((a, b) => new Date(b?.updatedAt || b?.createdAt || b?.invoiceDate || 0) - new Date(a?.updatedAt || a?.createdAt || a?.invoiceDate || 0))
    .slice(0, limit);
}

export default function DistributorAccountantWorkspace({ initialSection = "overview" }) {
  const [activeSection, setActiveSection] = useState(() => SECTION_ITEMS.find((item) => item.key === initialSection) || SECTION_ITEMS[0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [financeReport, setFinanceReport] = useState(null);
  const [customerInvoices, setCustomerInvoices] = useState([]);
  const [customerReceipts, setCustomerReceipts] = useState([]);
  const [companyInvoices, setCompanyInvoices] = useState([]);
  const [expenses, setExpenses] = useState([]);

  useEffect(() => {
    const matched = SECTION_ITEMS.find((item) => item.key === initialSection);
    if (matched) setActiveSection(matched);
  }, [initialSection]);

  async function loadWorkspace() {
    setLoading(true);
    setError("");

    const results = await Promise.allSettled([
      v2Api.distributor.financeReport(),
      v2Api.distributor.listCustomerInvoices(),
      v2Api.distributor.listCustomerReceipts(),
      v2Api.distributor.listCompanyInvoices(),
      v2Api.distributor.listExpenses(),
    ]);

    const [financeRes, customerInvoiceRes, customerReceiptRes, companyInvoiceRes, expenseRes] = results;
    const firstError = results.find((item) => item.status === "rejected");
    if (firstError?.reason?.message) setError(firstError.reason.message);

    setFinanceReport(financeRes.status === "fulfilled" ? financeRes.value : null);
    setCustomerInvoices(customerInvoiceRes.status === "fulfilled" ? normalizeRows(customerInvoiceRes.value, "invoices") : []);
    setCustomerReceipts(customerReceiptRes.status === "fulfilled" ? normalizeRows(customerReceiptRes.value, "receipts") : []);
    setCompanyInvoices(companyInvoiceRes.status === "fulfilled" ? normalizeRows(companyInvoiceRes.value, "invoices") : []);
    setExpenses(expenseRes.status === "fulfilled" ? normalizeExpenses(expenseRes.value) : []);
    setLoading(false);
  }

  useEffect(() => {
    loadWorkspace();
  }, []);

  const accounts = Array.isArray(financeReport?.accounts) ? financeReport.accounts : [];
  const customerAging = useMemo(() => computeAgingBuckets(customerInvoices), [customerInvoices]);
  const companyPayableAging = useMemo(() => computeAgingBuckets(companyInvoices), [companyInvoices]);

  const customerInvoiceTotal = useMemo(() => customerInvoices.reduce((sum, row) => sum + safeNumber(row?.invoiceTotal || row?.totals?.grandTotal), 0), [customerInvoices]);
  const customerReceiptTotal = useMemo(() => customerReceipts.reduce((sum, row) => sum + safeNumber(row?.amount), 0), [customerReceipts]);
  const companyPayableTotal = useMemo(() => companyInvoices.reduce((sum, row) => sum + safeNumber(row?.balanceAmount || row?.invoiceTotal), 0), [companyInvoices]);
  const expenseTotal = useMemo(() => expenses.reduce((sum, row) => sum + safeNumber(row?.amount || row?.expenseAmount), 0), [expenses]);
  const cashBalance = useMemo(() => accounts.filter((row) => /cash/i.test(String(row?.accountType || row?.accountName || ""))).reduce((sum, row) => sum + safeNumber(row?.currentBalance), 0), [accounts]);
  const bankBalance = useMemo(() => accounts.filter((row) => /bank/i.test(String(row?.accountType || row?.accountName || ""))).reduce((sum, row) => sum + safeNumber(row?.currentBalance), 0), [accounts]);
  const grossProfitProxy = customerInvoiceTotal - companyInvoices.reduce((sum, row) => sum + safeNumber(row?.invoiceTotal || row?.totals?.grandTotal), 0);
  const netProfitProxy = grossProfitProxy - expenseTotal;

  const heroCards = [
    { label: "Customer outstanding", value: formatCurrency(customerAging.total), helper: `${formatCurrency(customerReceiptTotal)} collected from customers` },
    { label: "Payable to company", value: formatCurrency(companyPayableTotal), helper: `${companyInvoices.length} company invoices pending settlement` },
    { label: "Cash & bank", value: formatCurrency(cashBalance + bankBalance), helper: `${formatCurrency(cashBalance)} cash • ${formatCurrency(bankBalance)} bank` },
    { label: "Distributor P&L", value: formatCurrency(netProfitProxy), helper: `${formatCurrency(grossProfitProxy)} gross profit proxy after expenses` },
  ];

  const customerInvoiceColumns = [
    { key: "documentNo", title: "Invoice" },
    { key: "customer", title: "Customer", render: (row) => row?.customer?.partyName || row?.customer?.partyCode || "Customer" },
    { key: "invoiceTotal", title: "Invoice total", render: (row) => formatCurrency(row?.invoiceTotal || row?.totals?.grandTotal) },
    { key: "balanceAmount", title: "Balance", render: (row) => formatCurrency(row?.balanceAmount || row?.invoiceTotal) },
    { key: "paymentStatus", title: "Payment", type: "status", render: (row) => row?.paymentStatus || "unpaid" },
    { key: "invoiceDate", title: "Date", render: (row) => formatDate(row?.invoiceDate || row?.createdAt) },
  ];

  const customerReceiptColumns = [
    { key: "documentNo", title: "Receipt" },
    { key: "customer", title: "Customer", render: (row) => row?.customer?.partyName || row?.customer?.partyCode || "Customer" },
    { key: "amount", title: "Amount", render: (row) => formatCurrency(row?.amount) },
    { key: "paymentMethod", title: "Method" },
    { key: "status", title: "Status", type: "status", render: (row) => row?.status || "draft" },
    { key: "allocations", title: "Allocation", render: (row) => `${row?.allocations?.length || 0} linked` },
    { key: "paymentDate", title: "Date", render: (row) => formatDate(row?.paymentDate || row?.createdAt) },
  ];

  const companyInvoiceColumns = [
    { key: "documentNo", title: "Company invoice" },
    { key: "invoiceTotal", title: "Invoice total", render: (row) => formatCurrency(row?.invoiceTotal || row?.totals?.grandTotal) },
    { key: "balanceAmount", title: "Balance", render: (row) => formatCurrency(row?.balanceAmount || row?.invoiceTotal) },
    { key: "paymentStatus", title: "Payment", type: "status", render: (row) => row?.paymentStatus || "unpaid" },
    { key: "dueDate", title: "Due", render: (row) => formatDate(row?.dueDate || row?.invoiceDate || row?.createdAt) },
  ];

  const accountColumns = [
    { key: "accountName", title: "Account" },
    { key: "accountType", title: "Type", render: (row) => row?.accountType || row?.type || "-" },
    { key: "currentBalance", title: "Balance", render: (row) => formatCurrency(row?.currentBalance) },
    { key: "health", title: "Health", render: (row) => <StatusBadge value={safeNumber(row?.currentBalance) >= 0 ? "balanced" : "negative"} tone={safeNumber(row?.currentBalance) >= 0 ? "approved" : "unpaid"} /> },
  ];

  const expenseRows = recentRows(expenses, 12);

  const contentMap = {
    overview: (
      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard title="Collection and settlement pressure" description="The most important finance areas for distributor accountant follow-up.">
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-2xl bg-zinc-50 px-4 py-3 text-sm"><span className="text-zinc-600">Customer outstanding</span><StatusBadge value={formatCurrency(customerAging.total)} tone={customerAging.total > 0 ? "pending" : "approved"} /></div>
            <div className="flex items-center justify-between rounded-2xl bg-zinc-50 px-4 py-3 text-sm"><span className="text-zinc-600">Payable to company</span><StatusBadge value={formatCurrency(companyPayableTotal)} tone={companyPayableTotal > 0 ? "pending" : "approved"} /></div>
            <div className="flex items-center justify-between rounded-2xl bg-zinc-50 px-4 py-3 text-sm"><span className="text-zinc-600">Expense posted</span><StatusBadge value={formatCurrency(expenseTotal)} tone={expenseTotal > 0 ? "info" : "approved"} /></div>
            <div className="flex items-center justify-between rounded-2xl bg-zinc-50 px-4 py-3 text-sm"><span className="text-zinc-600">Cash + bank</span><StatusBadge value={formatCurrency(cashBalance + bankBalance)} tone="approved" /></div>
          </div>
        </SectionCard>

        <SectionCard title="Quick actions" description="Move straight into the distributor accountant workflows behind this summary panel.">
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { title: "Customer receipts", href: "/dashboards/distributor/receipts", note: "Track collections and receipt activity." },
              { title: "Payable to company", href: "/dashboards/distributor/payments", note: "Review company invoices and settlement posture." },
              { title: "Distributor expense", href: "/dashboards/distributor/expense", note: "Continue expense posting and audit review." },
              { title: "Reports", href: "/dashboards/distributor/reports", note: "Open deeper sales, finance, and performance reports." },
            ].map((action) => (
              <Link key={action.href} href={action.href} className="rounded-3xl border border-zinc-200 bg-zinc-50 px-4 py-4 transition hover:border-emerald-200 hover:bg-emerald-50">
                <div className="text-sm font-semibold text-zinc-900">{action.title}</div>
                <div className="mt-1 text-xs leading-5 text-zinc-600">{action.note}</div>
              </Link>
            ))}
          </div>
        </SectionCard>
      </div>
    ),
    "customer-invoices": (
      <SectionCard title="Customer invoices" description="Open and recent distributor-customer invoices for billing and recovery visibility.">
        <DocumentTable columns={customerInvoiceColumns} rows={recentRows(customerInvoices, 16)} emptyTitle="No customer invoices" emptyDescription="Invoices will appear here once distributor-side billing starts posting to V2 finance." />
      </SectionCard>
    ),
    "customer-receipts": (
      <SectionCard title="Customer receipts" description="Receipt posting visibility and allocation linkage against customer invoices.">
        <DocumentTable columns={customerReceiptColumns} rows={recentRows(customerReceipts, 16)} emptyTitle="No customer receipts" emptyDescription="Receipts will appear here once collections are posted through the distributor side." />
      </SectionCard>
    ),
    aging: (
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard title="Customer aging buckets" description="Outstanding customer balances grouped by due pressure.">
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: "Current", value: customerAging.current },
              { label: "1–30 days", value: customerAging.d1_30 },
              { label: "31–60 days", value: customerAging.d31_60 },
              { label: "61–90 days", value: customerAging.d61_90 },
              { label: "90+ days", value: customerAging.d90_plus },
              { label: "Total", value: customerAging.total },
            ].map((item) => (
              <div key={item.label} className="rounded-3xl border border-zinc-200 bg-zinc-50 px-4 py-4">
                <div className="text-sm font-medium text-zinc-500">{item.label}</div>
                <div className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">{formatCurrency(item.value)}</div>
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Invoices requiring recovery" description="Customer invoices with remaining balance for accountant follow-up.">
          <DocumentTable columns={customerInvoiceColumns} rows={customerInvoices.filter((row) => safeNumber(row?.balanceAmount || row?.invoiceTotal) > 0).slice(0, 16)} emptyTitle="No outstanding invoices" emptyDescription="Open customer invoices will appear here as soon as balances remain unpaid." />
        </SectionCard>
      </div>
    ),
    "payable-company": (
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard title="Payable to company" description="Outstanding settlement back to company supply based on posted company invoices.">
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: "Open payable", value: companyPayableAging.total },
              { label: "Current", value: companyPayableAging.current },
              { label: "1–30 days", value: companyPayableAging.d1_30 },
              { label: "31–60+ days", value: companyPayableAging.d31_60 + companyPayableAging.d61_90 + companyPayableAging.d90_plus },
            ].map((item) => (
              <div key={item.label} className="rounded-3xl border border-zinc-200 bg-zinc-50 px-4 py-4">
                <div className="text-sm font-medium text-zinc-500">{item.label}</div>
                <div className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">{formatCurrency(item.value)}</div>
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Company invoices to settle" description="Latest company invoices raised against the distributor.">
          <DocumentTable columns={companyInvoiceColumns} rows={recentRows(companyInvoices, 16)} emptyTitle="No company invoices" emptyDescription="Company-raised invoices will appear here after the V2 company-distributor finance bridge posts them." />
        </SectionCard>
      </div>
    ),
    expenses: (
      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <SectionCard title="Cash / bank & P&L snapshot" description="High-level cash/bank position and distributor P&L proxy based on billing, company payable, and expense postings.">
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: "Cash balance", value: cashBalance, note: "Accounts tagged as cash" },
              { label: "Bank balance", value: bankBalance, note: "Accounts tagged as bank" },
              { label: "Gross profit proxy", value: grossProfitProxy, note: "Customer invoice total minus company invoice total" },
              { label: "Net operating proxy", value: netProfitProxy, note: "Gross profit proxy minus posted expenses" },
            ].map((item) => (
              <div key={item.label} className="rounded-3xl border border-zinc-200 bg-zinc-50 px-4 py-4">
                <div className="text-sm font-medium text-zinc-500">{item.label}</div>
                <div className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">{formatCurrency(item.value)}</div>
                <div className="mt-2 text-xs text-zinc-500">{item.note}</div>
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Expense posting visibility" description="Recently posted distributor expense entries and tracked cash/bank accounts.">
          <div className="space-y-4">
            <DocumentTable columns={accountColumns} rows={accounts} emptyTitle="No accounts found" emptyDescription="Cash and bank accounts will appear here once finance reporting is populated." />
            {!expenseRows.length ? (
              <EmptyState title="No expense entries yet" description="Distributor expenses will appear here once entries are posted through the expense module." />
            ) : (
              <div className="space-y-3">
                {expenseRows.map((expense) => (
                  <div key={String(expense?._id || expense?.id || expense?.createdAt)} className="rounded-3xl border border-zinc-200 bg-zinc-50 px-4 py-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="text-sm font-semibold text-zinc-900">{expense?.title || expense?.category || expense?.type || "Distributor expense"}</div>
                        <div className="mt-1 text-xs text-zinc-500">{expense?.description || expense?.notes || "Expense posting captured in distributor operations."}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-zinc-900">{formatCurrency(expense?.amount || expense?.expenseAmount)}</div>
                        <div className="mt-1 text-xs text-zinc-500">{formatDate(expense?.expenseDate || expense?.createdAt)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SectionCard>
      </div>
    ),
  };

  return (
    <UserDashboardShell
      title="Distributor Accountant"
      subtitle="Track customer invoices, receipts, outstanding, payables, expenses, cash/bank, and P&L from one V2 accountant workspace."
      roleKey="Distributor Accountant"
      links={userDashboardSearchItems.distributorAccountant || userDashboardSearchItems.distributor || []}
      showAccountCards
    >
      <div className="space-y-6">
        <PageHeader
          eyebrow="Distributor Accountant"
          title="Distributor finance command center"
          description="A shared V2 finance workspace for customer billing, recovery, payable to company, expense posting visibility, cash/bank balance, and distributor P&L snapshot."
          actions={
            <>
              <button
                type="button"
                onClick={loadWorkspace}
                className="rounded-2xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Refresh finance data
              </button>
              <Link href="/dashboards/distributor/receipts" className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                Open receipts
              </Link>
            </>
          }
        />

        {error ? <div className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">{error}</div> : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {heroCards.map((card) => (
            <SectionCard key={card.label} className="bg-gradient-to-br from-white to-zinc-50">
              <div className="text-sm font-medium text-zinc-500">{card.label}</div>
              <div className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">{card.value}</div>
              <div className="mt-2 text-xs text-zinc-500">{card.helper}</div>
            </SectionCard>
          ))}
        </div>

        <ModuleCardStrip items={SECTION_ITEMS} activeKey={activeSection.key} onSelect={setActiveSection} />

        {loading ? (
          <div className="rounded-3xl border border-zinc-200 bg-white px-4 py-10 text-center text-sm text-zinc-500 shadow-sm">
            Loading distributor accountant workspace…
          </div>
        ) : (
          contentMap[activeSection.key]
        )}
      </div>
    </UserDashboardShell>
  );
}
