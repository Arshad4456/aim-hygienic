"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import UserDashboardShell from "../../components/userDashboardShell";
import { userDashboardSearchItems } from "../../searchItems";
import { getAuthSnapshot } from "../../../lib/clientAuth";
import { v2Api } from "../../../lib/api";
import PageHeader from "../../../components/foundation/PageHeader";
import SectionCard from "../../../components/foundation/SectionCard";
import ModuleCardStrip from "../../../components/foundation/ModuleCardStrip";
import DocumentTable from "../../../components/foundation/DocumentTable";
import EmptyState from "../../../components/foundation/EmptyState";
import StatusBadge from "../../../components/foundation/StatusBadge";

const SECTION_ITEMS = [
  { key: "overview", title: "Customer dashboard", description: "Orders, invoices, receipts, outstanding, and return visibility in one place." },
  { key: "orders", title: "Order visibility", description: "Track order requests and current order states." },
  { key: "invoices", title: "Invoice visibility", description: "Review invoices raised against your purchases." },
  { key: "receipts", title: "Receipt visibility", description: "See receipt status and payment acknowledgements." },
  { key: "outstanding", title: "Outstanding snapshot", description: "Understand open balance and aging pressure." },
  { key: "payment-history", title: "Payment history", description: "Review past payments and posted receipts." },
  { key: "returns", title: "Return requests", description: "See return request and return document visibility." },
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

function normalizeReturns(response) {
  return Array.isArray(response?.returns) ? response.returns : [];
}

function matchesCustomer(row, customerId, customerName) {
  if (!row) return false;
  const ids = [
    row?.customerId,
    row?.customer?.partyId,
    row?.customer?._id,
    row?.partyId,
    row?.payer?.partyId,
    row?.fromParty?.partyId,
    row?.toParty?.partyId,
    row?.userId,
    row?.createdBy,
  ].map((value) => String(value || "").trim()).filter(Boolean);

  const names = [
    row?.customerName,
    row?.customer?.partyName,
    row?.customer?.fullName,
    row?.payer?.partyName,
    row?.fromParty?.partyName,
    row?.toParty?.partyName,
  ].map((value) => String(value || "").trim().toLowerCase()).filter(Boolean);

  return (customerId && ids.includes(customerId)) || (customerName && names.includes(customerName));
}

function recentRows(rows = [], limit = 8) {
  return [...(Array.isArray(rows) ? rows : [])]
    .sort((a, b) => new Date(b?.updatedAt || b?.paymentDate || b?.invoiceDate || b?.createdAt || 0) - new Date(a?.updatedAt || a?.paymentDate || a?.invoiceDate || a?.createdAt || 0))
    .slice(0, limit);
}

function computeAgingBuckets(invoices = []) {
  const today = new Date();
  const buckets = { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90_plus: 0, total: 0 };

  for (const invoice of invoices) {
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

export default function CustomerWorkspace({ initialSection = "overview" }) {
  const auth = useMemo(() => getAuthSnapshot(), []);
  const customerId = String(auth?.user?.customerId || auth?.payload?.customerId || auth?.user?.uid || auth?.payload?.uid || auth?.payload?.userId || "").trim();
  const customerName = String(auth?.user?.fullName || auth?.user?.username || auth?.payload?.username || "").trim().toLowerCase();

  const [activeSection, setActiveSection] = useState(() => SECTION_ITEMS.find((item) => item.key === initialSection) || SECTION_ITEMS[0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orders, setOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [returns, setReturns] = useState([]);

  useEffect(() => {
    const matched = SECTION_ITEMS.find((item) => item.key === initialSection);
    if (matched) setActiveSection(matched);
  }, [initialSection]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError("");

      const responses = await Promise.allSettled([
        v2Api.customer.listOrders(),
        v2Api.customer.listInvoices(),
        v2Api.customer.listReceipts(),
        v2Api.customer.listReturns({ status: "all" }),
      ]);

      if (!mounted) return;

      const [ordersRes, invoicesRes, receiptsRes, returnsRes] = responses;

      const rawOrders = ordersRes.status === "fulfilled" ? normalizeRows(ordersRes.value, "orders") : [];
      const rawInvoices = invoicesRes.status === "fulfilled" ? normalizeRows(invoicesRes.value, "invoices") : [];
      const rawReceipts = receiptsRes.status === "fulfilled" ? normalizeRows(receiptsRes.value, "receipts") : [];
      const rawReturns = returnsRes.status === "fulfilled" ? normalizeReturns(returnsRes.value) : [];

      setOrders(rawOrders.filter((row) => matchesCustomer(row, customerId, customerName) || !customerId));
      setInvoices(rawInvoices.filter((row) => matchesCustomer(row, customerId, customerName) || !customerId));
      setReceipts(rawReceipts.filter((row) => matchesCustomer(row, customerId, customerName) || !customerId));
      setReturns(rawReturns.filter((row) => matchesCustomer(row, customerId, customerName) || !customerId));

      const failure = responses.find((entry) => entry.status === "rejected");
      if (failure) setError(failure.reason?.message || "Some customer panel signals could not be loaded.");
      setLoading(false);
    }

    load();
    return () => {
      mounted = false;
    };
  }, [customerId, customerName]);

  const aging = useMemo(() => computeAgingBuckets(invoices), [invoices]);
  const paidValue = useMemo(() => receipts.reduce((sum, row) => sum + safeNumber(row?.amount), 0), [receipts]);
  const invoiceValue = useMemo(() => invoices.reduce((sum, row) => sum + safeNumber(row?.invoiceTotal || row?.totals?.grandTotal), 0), [invoices]);
  const outstandingValue = aging.total;

  const heroCards = useMemo(() => [
    { label: "Order requests", value: String(orders.length), note: `${orders.filter((row) => String(row?.status || "").toLowerCase() === "approved").length} approved` },
    { label: "Invoice total", value: formatCurrency(invoiceValue), note: `${invoices.length} invoices visible` },
    { label: "Outstanding", value: formatCurrency(outstandingValue), note: `${formatCurrency(paidValue)} paid / acknowledged` },
    { label: "Return requests", value: String(returns.length), note: `${returns.filter((row) => String(row?.status || "").toLowerCase() === "approved").length} approved returns` },
  ], [orders, invoiceValue, invoices.length, outstandingValue, paidValue, returns]);

  const orderColumns = [
    { key: "documentNo", title: "Order" },
    { key: "status", title: "Status", type: "status" },
    { key: "dispatchStatus", title: "Delivery", type: "status", render: (row) => row?.dispatchStatus || row?.status || "pending" },
    { key: "grandTotal", title: "Value", render: (row) => formatCurrency(row?.totals?.grandTotal || row?.invoiceTotal || 0) },
    { key: "updatedAt", title: "Updated", render: (row) => formatDate(row?.updatedAt || row?.createdAt) },
  ];

  const invoiceColumns = [
    { key: "documentNo", title: "Invoice" },
    { key: "invoiceDate", title: "Date", render: (row) => formatDate(row?.invoiceDate || row?.createdAt) },
    { key: "invoiceTotal", title: "Total", render: (row) => formatCurrency(row?.invoiceTotal || row?.totals?.grandTotal) },
    { key: "balanceAmount", title: "Outstanding", render: (row) => formatCurrency(row?.balanceAmount || row?.invoiceTotal) },
    { key: "paymentStatus", title: "Payment", type: "status", render: (row) => row?.paymentStatus || "unpaid" },
  ];

  const receiptColumns = [
    { key: "documentNo", title: "Receipt" },
    { key: "paymentDate", title: "Date", render: (row) => formatDate(row?.paymentDate || row?.createdAt) },
    { key: "amount", title: "Amount", render: (row) => formatCurrency(row?.amount) },
    { key: "paymentMethod", title: "Method" },
    { key: "status", title: "Status", type: "status", render: (row) => row?.status || "pending" },
  ];

  const returnColumns = [
    { key: "documentNo", title: "Return" },
    { key: "returnType", title: "Type" },
    { key: "status", title: "Status", type: "status", render: (row) => row?.status || "draft" },
    { key: "createdAt", title: "Created", render: (row) => formatDate(row?.createdAt) },
  ];

  const sectionCards = activeSection.key === "outstanding"
    ? [
        { label: "Current", value: formatCurrency(aging.current), note: "Active cycle and not overdue yet." },
        { label: "1–30 days", value: formatCurrency(aging.d1_30), note: "Needs near-term follow-up or payment." },
        { label: "31–60 days", value: formatCurrency(aging.d31_60), note: "Escalating overdue exposure." },
        { label: "90+ days", value: formatCurrency(aging.d90_plus), note: "Highest overdue risk bucket." },
      ]
    : activeSection.key === "payment-history"
      ? [
          { label: "Total paid", value: formatCurrency(paidValue), note: "Receipts visible in your history." },
          { label: "Receipt count", value: String(receipts.length), note: "Payment acknowledgements and receipt records." },
          { label: "Pending receipts", value: String(receipts.filter((row) => String(row?.status || "").toLowerCase() !== "posted").length), note: "Still awaiting approval or post." },
          { label: "Coverage", value: invoiceValue > 0 ? `${Math.min((paidValue / invoiceValue) * 100, 100).toFixed(0)}%` : "0%", note: "Paid value versus invoice total." },
        ]
      : activeSection.key === "returns"
        ? [
            { label: "Return requests", value: String(returns.length), note: "All visible customer return documents." },
            { label: "Approved", value: String(returns.filter((row) => String(row?.status || "").toLowerCase() === "approved").length), note: "Approved and ready for follow-up." },
            { label: "Pending", value: String(returns.filter((row) => String(row?.status || "").toLowerCase() === "pending").length), note: "Still awaiting review or action." },
            { label: "Rejected", value: String(returns.filter((row) => String(row?.status || "").toLowerCase() === "rejected").length), note: "Requests not accepted so far." },
          ]
        : heroCards;

  const content = (() => {
    if (loading) {
      return <EmptyState title="Loading customer workspace" description="Fetching orders, invoices, receipts, and return visibility from the V2 backend." />;
    }

    if (activeSection.key === "overview") {
      return (
        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <SectionCard title="Quick actions" description="Keep the working order-request and receipt entry screens alive while using the new customer dashboard for visibility.">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { title: "Order request desk", href: "/portals/customer/orders", note: "Open the existing order request flow." },
                { title: "Receipt desk", href: "/portals/customer/receipts", note: "Open the existing receipt submission flow." },
                { title: "Invoice visibility", href: "/portals/customer/invoices", note: "Review invoices raised against your orders." },
                { title: "Return requests", href: "/portals/customer/returns", note: "Track your return requests and return document status." },
              ].map((item) => (
                <Link key={item.href} href={item.href} className="rounded-3xl border border-zinc-200 bg-zinc-50 px-4 py-4 transition hover:border-emerald-200 hover:bg-emerald-50">
                  <div className="text-sm font-semibold text-zinc-900">{item.title}</div>
                  <div className="mt-1 text-xs leading-5 text-zinc-600">{item.note}</div>
                </Link>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Current account position" description="A simple customer-side view of invoice, payment, and return pressure.">
            <div className="space-y-3 text-sm text-zinc-700">
              <div className="flex items-center justify-between rounded-2xl bg-zinc-50 px-4 py-3">
                <span>Open outstanding</span>
                <StatusBadge value={formatCurrency(outstandingValue)} tone={outstandingValue > 0 ? "pending" : "approved"} />
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-zinc-50 px-4 py-3">
                <span>Total invoice value</span>
                <StatusBadge value={formatCurrency(invoiceValue)} tone="info" />
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-zinc-50 px-4 py-3">
                <span>Total payment history</span>
                <StatusBadge value={formatCurrency(paidValue)} tone={paidValue > 0 ? "approved" : "draft"} />
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-zinc-50 px-4 py-3">
                <span>Return visibility</span>
                <StatusBadge value={`${returns.length} requests`} tone={returns.length > 0 ? "partial" : "draft"} />
              </div>
            </div>
          </SectionCard>
        </div>
      );
    }

    if (activeSection.key === "orders") {
      return (
        <SectionCard title="Order visibility" description="Track order request status and delivery progression from your customer account.">
          <DocumentTable columns={orderColumns} rows={recentRows(orders, 20)} emptyTitle="No customer orders yet" emptyDescription="Once you create order requests, they will appear here with status visibility." />
        </SectionCard>
      );
    }

    if (activeSection.key === "invoices") {
      return (
        <SectionCard title="Invoice visibility" description="Review invoice totals, outstanding balance, and payment status.">
          <DocumentTable columns={invoiceColumns} rows={recentRows(invoices, 20)} emptyTitle="No invoices yet" emptyDescription="Posted invoices against your customer account will appear here." />
        </SectionCard>
      );
    }

    if (activeSection.key === "receipts") {
      return (
        <SectionCard title="Receipt visibility" description="See receipt records, methods, and approval/post status.">
          <DocumentTable columns={receiptColumns} rows={recentRows(receipts, 20)} emptyTitle="No receipts yet" emptyDescription="Receipts will appear here once payments are submitted or acknowledged." />
        </SectionCard>
      );
    }

    if (activeSection.key === "outstanding") {
      return (
        <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
          <SectionCard title="Outstanding aging" description="Customer invoice aging grouped by pressure bucket.">
            <div className="grid gap-3 sm:grid-cols-2">
              {sectionCards.map((item) => (
                <div key={item.label} className="rounded-3xl border border-zinc-200 bg-zinc-50 px-4 py-4">
                  <div className="text-sm font-medium text-zinc-500">{item.label}</div>
                  <div className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">{item.value}</div>
                  <div className="mt-2 text-xs text-zinc-500">{item.note}</div>
                </div>
              ))}
            </div>
          </SectionCard>
          <SectionCard title="Open invoices" description="Invoices that still carry an outstanding balance.">
            <DocumentTable columns={invoiceColumns} rows={recentRows(invoices.filter((row) => safeNumber(row?.balanceAmount || row?.invoiceTotal) > 0), 20)} emptyTitle="No outstanding invoices" emptyDescription="No open invoice balance is visible right now." />
          </SectionCard>
        </div>
      );
    }

    if (activeSection.key === "payment-history") {
      return (
        <div className="space-y-5">
          <SectionCard title="Payment history" description="Receipt and payment acknowledgement timeline from your customer account.">
            <DocumentTable columns={receiptColumns} rows={recentRows(receipts, 30)} emptyTitle="No payment history yet" emptyDescription="Once receipts are posted or acknowledged, they will appear here." />
          </SectionCard>
        </div>
      );
    }

    return (
      <SectionCard title="Return request visibility" description="Track customer return requests and their current review or posting state.">
        <DocumentTable columns={returnColumns} rows={recentRows(returns, 20)} emptyTitle="No return requests yet" emptyDescription="When returns are created for your account, they will appear here with status visibility." />
      </SectionCard>
    );
  })();

  return (
    <UserDashboardShell
      title="Customer Dashboard"
      subtitle="Track your orders, invoices, receipts, outstanding, payment history, and returns from one V2-first customer workspace."
      roleKey="Customer"
      links={userDashboardSearchItems.customer || []}
    >
      <div className="space-y-5">
        <PageHeader
          eyebrow="Customer"
          title="Customer account command center"
          description="A cleaner customer workspace for visibility across orders, invoices, receipts, outstanding amounts, payment history, and return requests."
          actions={
            <>
              <Link href="/portals/customer/orders" className="rounded-2xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50">
                Order request desk
              </Link>
              <Link href="/portals/customer/receipts" className="rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700">
                Receipt desk
              </Link>
            </>
          }
        />

        {error ? <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div> : null}

        <div className="grid gap-4 xl:grid-cols-4">
          {heroCards.map((card) => (
            <SectionCard key={card.label} className="bg-gradient-to-br from-white to-zinc-50">
              <div className="text-sm font-medium text-zinc-500">{card.label}</div>
              <div className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">{card.value}</div>
              <div className="mt-2 text-xs text-zinc-500">{card.note}</div>
            </SectionCard>
          ))}
        </div>

        <ModuleCardStrip items={SECTION_ITEMS} activeKey={activeSection.key} onSelect={setActiveSection} />

        {!loading && activeSection.key !== "overview" ? (
          <div className="grid gap-4 xl:grid-cols-4">
            {sectionCards.map((item) => (
              <SectionCard key={item.label} className="bg-gradient-to-br from-white to-zinc-50">
                <div className="text-sm font-medium text-zinc-500">{item.label}</div>
                <div className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">{item.value}</div>
                <div className="mt-2 text-xs text-zinc-500">{item.note}</div>
              </SectionCard>
            ))}
          </div>
        ) : null}

        {content}
      </div>
    </UserDashboardShell>
  );
}
