"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PageHeader from "../../../components/foundation/PageHeader";
import SectionCard from "../../../components/foundation/SectionCard";
import ModuleCardStrip from "../../../components/foundation/ModuleCardStrip";
import DocumentTable from "../../../components/foundation/DocumentTable";
import EmptyState from "../../../components/foundation/EmptyState";
import StatusBadge from "../../../components/foundation/StatusBadge";
import { v2Api } from "../../../lib/api";

const SECTION_ITEMS = [
  { key: "overview", title: "Distributor overview", description: "Stock, sales, recovery, and company settlement in one command center." },
  { key: "sales", title: "Customer sales", description: "Secondary orders, customer billing, and field execution signals." },
  { key: "recovery", title: "Recovery & outstanding", description: "Customer receipts, aging pressure, and collection momentum." },
  { key: "company", title: "Payable to company", description: "Open invoices from company supply and settlement readiness." },
  { key: "expenses", title: "Expense snapshot", description: "Distributor operational expense visibility for upcoming finance passes." },
];

function safeNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatNumber(value) {
  return safeNumber(value).toLocaleString();
}

function formatCurrency(value) {
  return `PKR ${formatNumber(value)}`;
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function sumBy(rows, getter) {
  return (Array.isArray(rows) ? rows : []).reduce((total, row) => total + safeNumber(getter(row)), 0);
}

function normalizeRows(response, key) {
  return Array.isArray(response?.[key]) ? response[key] : [];
}

function normalizeExpenses(response) {
  return Array.isArray(response) ? response : Array.isArray(response?.expenses) ? response.expenses : [];
}

function computeAgingBuckets(invoices = []) {
  const today = new Date();
  const buckets = { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90_plus: 0, total: 0 };

  for (const invoice of Array.isArray(invoices) ? invoices : []) {
    const remaining = safeNumber(invoice?.balanceAmount || invoice?.invoiceTotal);
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

function recentRows(rows = [], limit = 6) {
  return [...(Array.isArray(rows) ? rows : [])]
    .sort((a, b) => new Date(b?.updatedAt || b?.createdAt || 0) - new Date(a?.updatedAt || a?.createdAt || 0))
    .slice(0, limit);
}

export default function DistributorWorkspace() {
  const [activeSection, setActiveSection] = useState(SECTION_ITEMS[0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [overview, setOverview] = useState(null);
  const [salesKpi, setSalesKpi] = useState(null);
  const [inventoryReport, setInventoryReport] = useState(null);
  const [financeReport, setFinanceReport] = useState(null);
  const [secondaryOrders, setSecondaryOrders] = useState([]);
  const [customerReceipts, setCustomerReceipts] = useState([]);
  const [customerInvoices, setCustomerInvoices] = useState([]);
  const [companyInvoices, setCompanyInvoices] = useState([]);
  const [expenses, setExpenses] = useState([]);

  async function loadWorkspace() {
    setLoading(true);
    setError("");

    const results = await Promise.allSettled([
      v2Api.distributor.overview(),
      v2Api.distributor.salesKpi(),
      v2Api.distributor.inventoryReport(),
      v2Api.distributor.financeReport(),
      v2Api.distributor.listSecondaryOrders(),
      v2Api.distributor.listCustomerReceipts(),
      v2Api.distributor.listCustomerInvoices(),
      v2Api.distributor.listCompanyInvoices(),
      v2Api.distributor.listExpenses(),
    ]);

    const [overviewRes, salesKpiRes, inventoryRes, financeRes, orderRes, receiptRes, customerInvoiceRes, companyInvoiceRes, expenseRes] =
      results;

    const firstError = results.find((item) => item.status === "rejected");
    if (firstError?.reason?.message) {
      setError(firstError.reason.message);
    }

    setOverview(overviewRes.status === "fulfilled" ? overviewRes.value : null);
    setSalesKpi(salesKpiRes.status === "fulfilled" ? salesKpiRes.value : null);
    setInventoryReport(inventoryRes.status === "fulfilled" ? inventoryRes.value : null);
    setFinanceReport(financeRes.status === "fulfilled" ? financeRes.value : null);
    setSecondaryOrders(orderRes.status === "fulfilled" ? normalizeRows(orderRes.value, "orders") : []);
    setCustomerReceipts(receiptRes.status === "fulfilled" ? normalizeRows(receiptRes.value, "receipts") : []);
    setCustomerInvoices(customerInvoiceRes.status === "fulfilled" ? normalizeRows(customerInvoiceRes.value, "invoices") : []);
    setCompanyInvoices(companyInvoiceRes.status === "fulfilled" ? normalizeRows(companyInvoiceRes.value, "invoices") : []);
    setExpenses(expenseRes.status === "fulfilled" ? normalizeExpenses(expenseRes.value) : []);
    setLoading(false);
  }

  useEffect(() => {
    loadWorkspace();
  }, []);

  const outstandingBuckets = useMemo(() => computeAgingBuckets(customerInvoices), [customerInvoices]);
  const payableBuckets = useMemo(() => computeAgingBuckets(companyInvoices), [companyInvoices]);

  const stockOnHand = useMemo(() => {
    const moduleKpis = Array.isArray(inventoryReport?.module?.kpis) ? inventoryReport.module.kpis : [];
    const direct = moduleKpis.find((item) => /inventory on hand|stock on hand/i.test(item?.label || ""))?.value;
    return safeNumber(direct || overview?.kpis?.inventoryOnHand || inventoryReport?.totals?.onHandQuantity);
  }, [inventoryReport, overview]);

  const secondaryOrderValue = useMemo(
    () => sumBy(secondaryOrders, (row) => row?.totals?.grandTotal || row?.invoiceTotal || row?.totalAmount),
    [secondaryOrders],
  );

  const customerReceiptValue = useMemo(() => sumBy(customerReceipts, (row) => row?.amount), [customerReceipts]);
  const companyPayableValue = useMemo(
    () => sumBy(companyInvoices, (row) => row?.balanceAmount || row?.invoiceTotal),
    [companyInvoices],
  );
  const expenseValue = useMemo(() => sumBy(expenses, (row) => row?.amount || row?.expenseAmount), [expenses]);

  const heroCards = useMemo(
    () => [
      {
        label: "Stock on hand",
        value: formatNumber(stockOnHand),
        note: "Distributor inventory footprint from V2 inventory reporting.",
      },
      {
        label: "Customer sales",
        value: formatCurrency(secondaryOrderValue),
        note: `${formatNumber(secondaryOrders.length)} secondary orders in scope`,
      },
      {
        label: "Customer outstanding",
        value: formatCurrency(outstandingBuckets.total),
        note: `${formatCurrency(customerReceiptValue)} receipts collected`,
      },
      {
        label: "Payable to company",
        value: formatCurrency(companyPayableValue),
        note: `${formatNumber(companyInvoices.length)} company invoices to settle`,
      },
    ],
    [stockOnHand, secondaryOrderValue, secondaryOrders.length, outstandingBuckets.total, customerReceiptValue, companyPayableValue, companyInvoices.length],
  );

  const salesSnapshot = useMemo(() => {
    const kpis = salesKpi?.summary || salesKpi?.kpis || {};
    return [
      {
        label: "Approved orders",
        value: formatNumber(kpis.approvedOrders || secondaryOrders.filter((row) => String(row?.status).toLowerCase() === "approved").length),
        note: "Secondary orders ready to move through dispatch.",
      },
      {
        label: "Delivered orders",
        value: formatNumber(kpis.deliveredOrders || secondaryOrders.filter((row) => String(row?.dispatchStatus || row?.status).toLowerCase() === "delivered").length),
        note: "Delivered orders with customer fulfillment completion.",
      },
      {
        label: "Sales value",
        value: formatCurrency(kpis.salesValue || secondaryOrderValue),
        note: "Gross order value flowing through distributor sales.",
      },
      {
        label: "Team pressure",
        value: formatNumber(kpis.teamUsers || overview?.modules?.users || 0),
        note: "Salesman, order booker, and customer network in current scope.",
      },
    ];
  }, [salesKpi, secondaryOrders, secondaryOrderValue, overview?.modules?.users]);

  const recoverySnapshot = useMemo(
    () => [
      { label: "Current", value: formatCurrency(outstandingBuckets.current), note: "Not yet due or still inside active cycle." },
      { label: "1–30 days", value: formatCurrency(outstandingBuckets.d1_30), note: "Immediate recovery follow-up window." },
      { label: "31–60 days", value: formatCurrency(outstandingBuckets.d31_60), note: "Escalated customer collection attention." },
      { label: "90+ days", value: formatCurrency(outstandingBuckets.d90_plus), note: "High-risk exposure requiring direct action." },
    ],
    [outstandingBuckets],
  );

  const companyPayableSnapshot = useMemo(
    () => [
      { label: "Open company invoices", value: formatNumber(companyInvoices.length), note: "Invoices raised by company against distributor supply." },
      { label: "Payable total", value: formatCurrency(payableBuckets.total), note: "Outstanding to settle back to company." },
      { label: "Current payable", value: formatCurrency(payableBuckets.current), note: "Still within due cycle." },
      { label: "Over 30 days", value: formatCurrency(payableBuckets.d1_30 + payableBuckets.d31_60 + payableBuckets.d61_90 + payableBuckets.d90_plus), note: "Requires settlement planning and finance coordination." },
    ],
    [companyInvoices.length, payableBuckets],
  );

  const expenseSnapshot = useMemo(() => {
    const expenseByCategory = new Map();
    for (const row of expenses) {
      const key = row?.category || row?.type || "General";
      const current = expenseByCategory.get(key) || 0;
      expenseByCategory.set(key, current + safeNumber(row?.amount || row?.expenseAmount));
    }
    const topCategories = [...expenseByCategory.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([label, amount]) => `${label}: ${formatCurrency(amount)}`)
      .join(" • ");

    return [
      { label: "Expense total", value: formatCurrency(expenseValue), note: topCategories || "No distributor expense categories posted yet." },
      { label: "Expense records", value: formatNumber(expenses.length), note: "Distributor-side expense entries in current tenant scope." },
      { label: "Recovery coverage", value: expenseValue > 0 ? `${((customerReceiptValue / Math.max(expenseValue, 1)) * 100).toFixed(0)}%` : "0%", note: "Receipts collected compared with total posted expenses." },
      { label: "Finance pressure", value: formatCurrency(Math.max(companyPayableValue + expenseValue - customerReceiptValue, 0)), note: "Combined payable and expense pressure after receipt coverage." },
    ];
  }, [expenseValue, expenses, customerReceiptValue, companyPayableValue]);

  const customerInvoiceColumns = [
    { key: "documentNo", title: "Invoice" },
    { key: "customerName", title: "Customer", render: (row) => row?.customer?.partyName || row?.customer?.partyCode || "Customer" },
    { key: "invoiceTotal", title: "Invoice total", render: (row) => formatCurrency(row?.invoiceTotal || row?.totals?.grandTotal) },
    { key: "balanceAmount", title: "Balance", render: (row) => formatCurrency(row?.balanceAmount || row?.invoiceTotal) },
    { key: "paymentStatus", title: "Payment", type: "status", render: (row) => row?.paymentStatus || "unpaid" },
    { key: "invoiceDate", title: "Date", render: (row) => formatDate(row?.invoiceDate || row?.createdAt) },
  ];

  const companyInvoiceColumns = [
    { key: "documentNo", title: "Company invoice" },
    { key: "invoiceTotal", title: "Invoice total", render: (row) => formatCurrency(row?.invoiceTotal || row?.totals?.grandTotal) },
    { key: "balanceAmount", title: "Balance", render: (row) => formatCurrency(row?.balanceAmount || row?.invoiceTotal) },
    { key: "paymentStatus", title: "Payment", type: "status", render: (row) => row?.paymentStatus || "unpaid" },
    { key: "dueDate", title: "Due", render: (row) => formatDate(row?.dueDate || row?.invoiceDate || row?.createdAt) },
  ];

  const orderColumns = [
    { key: "documentNo", title: "Order" },
    { key: "customerName", title: "Customer", render: (row) => row?.customer?.partyName || row?.customer?.partyCode || "Customer" },
    { key: "grandTotal", title: "Value", render: (row) => formatCurrency(row?.totals?.grandTotal || row?.invoiceTotal || 0) },
    { key: "status", title: "Order status", type: "status" },
    { key: "dispatchStatus", title: "Dispatch", type: "status", render: (row) => row?.dispatchStatus || row?.status || "draft" },
    { key: "updatedAt", title: "Updated", render: (row) => formatDate(row?.updatedAt || row?.createdAt) },
  ];

  const receiptColumns = [
    { key: "documentNo", title: "Receipt" },
    { key: "customerName", title: "Customer", render: (row) => row?.customer?.partyName || row?.customer?.partyCode || "Customer" },
    { key: "amount", title: "Amount", render: (row) => formatCurrency(row?.amount) },
    { key: "paymentMethod", title: "Method" },
    { key: "status", title: "Status", type: "status" },
    { key: "paymentDate", title: "Date", render: (row) => formatDate(row?.paymentDate || row?.createdAt) },
  ];

  const quickActions = [
    { title: "Open secondary orders", href: "/dashboards/distributor/orders", note: "Approve, dispatch, and monitor customer orders." },
    { title: "Customer receipts", href: "/dashboards/distributor/receipts", note: "Post receipts and manage customer recovery." },
    { title: "Payable to company", href: "/dashboards/distributor/payments", note: "Track company settlement and invoice posture." },
    { title: "Distributor expenses", href: "/dashboards/distributor/expense", note: "Capture discount, field, and operational expenses." },
    { title: "Primary order request", href: "/dashboards/distributor/primary-order-request", note: "Raise stock demand to company supply side." },
    { title: "Reports workspace", href: "/dashboards/distributor/reports", note: "Review sales, inventory, finance, and territory performance." },
  ];

  const visibleContent = {
    overview: (
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Quick actions" description="Jump straight into the distributor modules that move stock, recovery, and expense management.">
          <div className="grid gap-3 sm:grid-cols-2">
            {quickActions.map((action) => (
              <Link key={action.href} href={action.href} className="rounded-3xl border border-zinc-200 bg-zinc-50 px-4 py-4 transition hover:border-emerald-200 hover:bg-emerald-50">
                <div className="text-sm font-semibold text-zinc-900">{action.title}</div>
                <div className="mt-1 text-xs leading-5 text-zinc-600">{action.note}</div>
              </Link>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Distributor pressure map" description="A simple owner-style view of where attention is needed most right now.">
          <div className="space-y-3 text-sm text-zinc-700">
            <div className="flex items-center justify-between rounded-2xl bg-zinc-50 px-4 py-3">
              <span>Customer outstanding</span>
              <StatusBadge value={formatCurrency(outstandingBuckets.total)} tone={outstandingBuckets.total > 0 ? "pending" : "approved"} />
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-zinc-50 px-4 py-3">
              <span>Payable to company</span>
              <StatusBadge value={formatCurrency(payableBuckets.total)} tone={payableBuckets.total > 0 ? "pending" : "approved"} />
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-zinc-50 px-4 py-3">
              <span>Posted expense total</span>
              <StatusBadge value={formatCurrency(expenseValue)} tone={expenseValue > 0 ? "info" : "approved"} />
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-zinc-50 px-4 py-3">
              <span>Receipt coverage</span>
              <StatusBadge value={formatCurrency(customerReceiptValue)} tone={customerReceiptValue >= outstandingBuckets.total && outstandingBuckets.total > 0 ? "approved" : "partial"} />
            </div>
          </div>
        </SectionCard>
      </div>
    ),
    sales: (
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard title="Recent secondary orders" description="Latest distributor-side customer orders flowing through V2 secondary order management.">
          <DocumentTable
            columns={orderColumns}
            rows={recentRows(secondaryOrders)}
            emptyTitle="No secondary orders yet"
            emptyDescription="Orders will appear here once customers, order bookers, or distributor staff create them."
          />
        </SectionCard>
        <SectionCard title="Customer invoice posture" description="Customer billing status and open balances for quick recovery awareness.">
          <DocumentTable
            columns={customerInvoiceColumns}
            rows={recentRows(customerInvoices)}
            emptyTitle="No customer invoices yet"
            emptyDescription="Customer invoices created from V2 receipts/invoice flow will appear here."
          />
        </SectionCard>
      </div>
    ),
    recovery: (
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard title="Recovery aging" description="Outstanding customer exposure grouped by due pressure.">
          <div className="grid gap-3 sm:grid-cols-2">
            {recoverySnapshot.map((item) => (
              <div key={item.label} className="rounded-3xl border border-zinc-200 bg-zinc-50 px-4 py-4">
                <div className="text-sm font-medium text-zinc-500">{item.label}</div>
                <div className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">{item.value}</div>
                <div className="mt-2 text-xs text-zinc-500">{item.note}</div>
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Recent customer receipts" description="Latest receipt collection activity and approval readiness.">
          <DocumentTable
            columns={receiptColumns}
            rows={recentRows(customerReceipts)}
            emptyTitle="No customer receipts yet"
            emptyDescription="Receipts posted by distributor-side users will appear here once recovery starts."
          />
        </SectionCard>
      </div>
    ),
    company: (
      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <SectionCard title="Company settlement snapshot" description="How much the distributor still needs to settle back to company supply.">
          <div className="grid gap-3 sm:grid-cols-2">
            {companyPayableSnapshot.map((item) => (
              <div key={item.label} className="rounded-3xl border border-zinc-200 bg-zinc-50 px-4 py-4">
                <div className="text-sm font-medium text-zinc-500">{item.label}</div>
                <div className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">{item.value}</div>
                <div className="mt-2 text-xs text-zinc-500">{item.note}</div>
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Company invoices to distributor" description="Open and posted company invoices that drive payable-to-company calculations.">
          <DocumentTable
            columns={companyInvoiceColumns}
            rows={recentRows(companyInvoices)}
            emptyTitle="No company invoices yet"
            emptyDescription="Company-raised invoices against distributor supply will appear here after finance posting."
          />
        </SectionCard>
      </div>
    ),
    expenses: (
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard title="Expense posture" description="Distributor-side operational spend snapshot ahead of deeper accountant and expense passes.">
          <div className="grid gap-3 sm:grid-cols-2">
            {expenseSnapshot.map((item) => (
              <div key={item.label} className="rounded-3xl border border-zinc-200 bg-zinc-50 px-4 py-4">
                <div className="text-sm font-medium text-zinc-500">{item.label}</div>
                <div className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">{item.value}</div>
                <div className="mt-2 text-xs text-zinc-500">{item.note}</div>
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Latest expense entries" description="Most recent distributor expense records already available in the system.">
          {!expenses.length ? (
            <EmptyState
              title="No expense entries yet"
              description="Distributor expenses will appear here once records are posted through the expense module."
            />
          ) : (
            <div className="space-y-3">
              {recentRows(expenses).map((expense) => (
                <div key={String(expense?._id || expense?.id || expense?.createdAt)} className="rounded-3xl border border-zinc-200 bg-zinc-50 px-4 py-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="text-sm font-semibold text-zinc-900">{expense?.title || expense?.category || expense?.type || "Distributor expense"}</div>
                      <div className="mt-1 text-xs text-zinc-500">{expense?.description || expense?.notes || "Expense entry from distributor operations."}</div>
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
        </SectionCard>
      </div>
    ),
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Distributor"
        title="Distributor command center"
        description="Run the distributor business from one V2-first landing view: stock on hand, customer sales, outstanding recovery, payable to company, and operating expense posture."
        actions={
          <>
            <button
              type="button"
              onClick={loadWorkspace}
              className="rounded-2xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Refresh dashboard
            </button>
            <Link href="/dashboards/distributor/orders" className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
              Open orders
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
            <div className="mt-2 text-xs text-zinc-500">{card.note}</div>
          </SectionCard>
        ))}
      </div>

      <ModuleCardStrip items={SECTION_ITEMS} activeKey={activeSection.key} onSelect={setActiveSection} />

      {loading ? (
        <div className="rounded-3xl border border-zinc-200 bg-white px-4 py-10 text-center text-sm text-zinc-500 shadow-sm">
          Loading distributor workspace…
        </div>
      ) : (
        <>
          <div className="grid gap-4 xl:grid-cols-4">
            {(() => {
              const snapshot =
                activeSection.key === "sales"
                  ? salesSnapshot
                  : activeSection.key === "recovery"
                  ? recoverySnapshot
                  : activeSection.key === "company"
                  ? companyPayableSnapshot
                  : activeSection.key === "expenses"
                  ? expenseSnapshot
                  : heroCards.map((card) => ({ label: card.label, value: card.value, note: card.note }));

              return snapshot.map((item) => (
                <SectionCard key={item.label} className="bg-gradient-to-br from-white to-zinc-50">
                  <div className="text-sm font-medium text-zinc-500">{item.label}</div>
                  <div className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">{item.value}</div>
                  <div className="mt-2 text-xs text-zinc-500">{item.note}</div>
                </SectionCard>
              ));
            })()}
          </div>
          {visibleContent[activeSection.key]}
        </>
      )}
    </div>
  );
}
