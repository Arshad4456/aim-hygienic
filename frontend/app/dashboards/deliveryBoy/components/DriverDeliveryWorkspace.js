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
  { key: "overview", title: "Execution dashboard", description: "Assigned routes, dispatches, POD, collections, and exception pressure." },
  { key: "day-plan", title: "Route / Day plan", description: "Today's assigned route and customer stop view from current delivery workload." },
  { key: "dispatches", title: "Assigned dispatches", description: "Delivery queue, states, POD status, and confirmation visibility." },
  { key: "tracking", title: "Live tracking", description: "Current delivery-team location visibility and online execution state." },
  { key: "exceptions", title: "Exceptions", description: "Not agreed receipts, rejected deliveries, and missing POD follow-up." },
];

function safeNumber(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value) {
  return `PKR ${safeNumber(value).toLocaleString()}`;
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
}

function statusTone(status = "") {
  const value = String(status || "").toLowerCase();
  if (["delivered", "received", "completed", "agreed"].includes(value)) return "approved";
  if (["in_transit", "dispatched", "approved"].includes(value)) return "posted";
  if (["rejected", "failed", "not_agreed", "exception"].includes(value)) return "unpaid";
  if (["pending", "assigned", "draft"].includes(value)) return "pending";
  return "info";
}

function uniqueCustomers(orders = []) {
  const map = new Map();
  for (const order of orders) {
    const key = String(order?.customerId || order?.customer?.partyId || order?.customerName || order?.customer?.partyName || order?._id || "");
    if (!key) continue;
    if (!map.has(key)) {
      map.set(key, {
        _id: key,
        customerName: order?.customerName || order?.customer?.partyName || order?.customer?.partyCode || "Customer",
        address: order?.customerAddress || order?.customer?.address || order?.shippingAddress || "-",
        area: order?.areaName || order?.territoryName || order?.regionName || "-",
        orders: 0,
        totalValue: 0,
      });
    }
    const current = map.get(key);
    current.orders += 1;
    current.totalValue += safeNumber(order?.totalAmount || order?.totals?.grandTotal);
  }
  return [...map.values()];
}

export default function DriverDeliveryWorkspace({ initialSection = "overview" }) {
  const auth = useMemo(() => getAuthSnapshot(), []);
  const currentUserId = String(auth?.user?.userId || auth?.payload?.userId || auth?.user?.uid || auth?.user?._id || "");
  const currentUsername = String(auth?.user?.username || auth?.payload?.username || "").toLowerCase();

  const [activeSection, setActiveSection] = useState(() => SECTION_ITEMS.find((item) => item.key === initialSection) || SECTION_ITEMS[0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orders, setOrders] = useState([]);
  const [customerInvoices, setCustomerInvoices] = useState([]);
  const [customerReceipts, setCustomerReceipts] = useState([]);
  const [liveUsers, setLiveUsers] = useState([]);
  const [me, setMe] = useState(null);

  useEffect(() => {
    const matched = SECTION_ITEMS.find((item) => item.key === initialSection);
    if (matched) setActiveSection(matched);
  }, [initialSection]);

  async function loadWorkspace() {
    setLoading(true);
    setError("");
    const results = await Promise.allSettled([
      v2Api.driverDelivery.me(),
      v2Api.driverDelivery.listMyOrders(),
      v2Api.driverDelivery.listCustomerInvoices(),
      v2Api.driverDelivery.listCustomerReceipts(),
      v2Api.driverDelivery.listLiveUsers(),
    ]);

    const [meRes, ordersRes, invoicesRes, receiptsRes, liveRes] = results;
    if (meRes.status === "fulfilled") setMe(meRes.value?.user || null);
    if (ordersRes.status === "fulfilled") setOrders(Array.isArray(ordersRes.value?.orders) ? ordersRes.value.orders : []);
    if (invoicesRes.status === "fulfilled") setCustomerInvoices(Array.isArray(invoicesRes.value?.invoices) ? invoicesRes.value.invoices : []);
    if (receiptsRes.status === "fulfilled") setCustomerReceipts(Array.isArray(receiptsRes.value?.receipts) ? receiptsRes.value.receipts : []);
    if (liveRes.status === "fulfilled") {
      const items = Array.isArray(liveRes.value?.data?.items) ? liveRes.value.data.items : [];
      setLiveUsers(items);
    }

    const firstError = results.find((item) => item.status === "rejected");
    if (firstError?.reason?.message) setError(firstError.reason.message);
    setLoading(false);
  }

  useEffect(() => {
    loadWorkspace();
  }, []);

  const assignedCustomers = useMemo(() => uniqueCustomers(orders), [orders]);
  const deliveryStates = useMemo(() => {
    const states = { pending: 0, inTransit: 0, delivered: 0, exceptions: 0, podPending: 0, confirmed: 0 };
    orders.forEach((order) => {
      const status = String(order?.status || "").toLowerCase();
      const agreement = String(order?.receiptAgreement || "").toLowerCase();
      if (["delivered", "received", "completed"].includes(status)) states.delivered += 1;
      else if (["approved", "in_transit", "dispatched"].includes(status)) states.inTransit += 1;
      else if (["rejected", "failed", "cancelled"].includes(status) || agreement === "not_agreed") states.exceptions += 1;
      else states.pending += 1;
      if (agreement === "agreed") states.confirmed += 1;
      if (!order?.proofOfDeliveryImageUrl && !order?.proofOfDeliveryUrl) states.podPending += 1;
    });
    return states;
  }, [orders]);

  const liveRows = useMemo(() => {
    const rows = Array.isArray(liveUsers) ? liveUsers : [];
    return rows.filter((row) => {
      const role = String(row?.role || "").toLowerCase();
      const rowUserId = String(row?.userId || row?.uid || row?._id || "");
      const rowUsername = String(row?.username || row?.name || "").toLowerCase();
      return role.includes("delivery") || role.includes("driver") || rowUserId === currentUserId || (currentUsername && rowUsername === currentUsername);
    });
  }, [liveUsers, currentUserId, currentUsername]);

  const routePlanRows = useMemo(() => assignedCustomers.map((customer, index) => ({
    ...customer,
    stopNo: index + 1,
    visitStatus: customer.orders > 0 ? "planned" : "idle",
  })), [assignedCustomers]);

  const collectionSummary = useMemo(() => {
    const customerNames = new Set(assignedCustomers.map((c) => c.customerName));
    const assignedInvoiceRows = customerInvoices.filter((row) => customerNames.has(row?.customer?.partyName || row?.customerName || ""));
    const assignedReceiptRows = customerReceipts.filter((row) => customerNames.has(row?.customer?.partyName || row?.customerName || ""));
    return {
      invoiceCount: assignedInvoiceRows.length,
      invoiceOutstanding: assignedInvoiceRows.reduce((sum, row) => sum + safeNumber(row?.balanceAmount || row?.invoiceTotal), 0),
      receiptCount: assignedReceiptRows.length,
      receiptAmount: assignedReceiptRows.reduce((sum, row) => sum + safeNumber(row?.amount), 0),
      receipts: assignedReceiptRows.slice(0, 8),
      invoices: assignedInvoiceRows.slice(0, 8),
    };
  }, [assignedCustomers, customerInvoices, customerReceipts]);

  const exceptionRows = useMemo(() => orders.filter((order) => {
    const status = String(order?.status || "").toLowerCase();
    const agreement = String(order?.receiptAgreement || "").toLowerCase();
    return ["rejected", "failed", "cancelled"].includes(status) || agreement === "not_agreed" || (!order?.proofOfDeliveryImageUrl && ["delivered", "received", "completed"].includes(status));
  }), [orders]);

  const overviewCards = [
    { label: "Assigned dispatches", value: orders.length.toLocaleString(), note: `${assignedCustomers.length} customer stops in current scope` },
    { label: "In transit", value: deliveryStates.inTransit.toLocaleString(), note: "Dispatches currently moving toward customer delivery" },
    { label: "Delivered", value: deliveryStates.delivered.toLocaleString(), note: `${deliveryStates.confirmed.toLocaleString()} confirmed receipts` },
    { label: "POD pending", value: deliveryStates.podPending.toLocaleString(), note: `${deliveryStates.exceptions.toLocaleString()} items need follow-up` },
  ];

  const orderColumns = [
    { key: "orderNo", title: "Dispatch / Order", render: (row) => row?.orderNo || row?.documentNo || row?._id || "Order" },
    { key: "customerName", title: "Customer", render: (row) => row?.customerName || row?.customer?.partyName || "Customer" },
    { key: "status", title: "Delivery state", type: "status", render: (row) => row?.status || "pending" },
    { key: "receiptAgreement", title: "Confirmation", render: (row) => <StatusBadge value={row?.receiptAgreement || "pending"} tone={statusTone(row?.receiptAgreement || "pending")} /> },
    { key: "proof", title: "POD", render: (row) => <StatusBadge value={row?.proofOfDeliveryImageUrl || row?.proofOfDeliveryUrl ? "uploaded" : "pending"} tone={row?.proofOfDeliveryImageUrl || row?.proofOfDeliveryUrl ? "approved" : "pending"} /> },
    { key: "updatedAt", title: "Updated", render: (row) => formatDate(row?.updatedAt || row?.createdAt) },
  ];

  const routeColumns = [
    { key: "stopNo", title: "Stop" },
    { key: "customerName", title: "Assigned customer" },
    { key: "area", title: "Area / route", render: (row) => row?.area || "-" },
    { key: "orders", title: "Dispatch count" },
    { key: "totalValue", title: "Value", render: (row) => formatCurrency(row?.totalValue) },
    { key: "visitStatus", title: "Visit", type: "status" },
  ];

  const liveColumns = [
    { key: "username", title: "User", render: (row) => row?.fullName || row?.username || row?.name || "User" },
    { key: "role", title: "Role", render: (row) => row?.role || "-" },
    { key: "status", title: "Status", type: "status", render: (row) => row?.status || "offline" },
    { key: "updatedAt", title: "Last update", render: (row) => formatDate(row?.updatedAt || row?.capturedAt) },
  ];

  const receiptColumns = [
    { key: "documentNo", title: "Receipt" },
    { key: "customerName", title: "Customer", render: (row) => row?.customer?.partyName || row?.customerName || "Customer" },
    { key: "amount", title: "Amount", render: (row) => formatCurrency(row?.amount) },
    { key: "status", title: "Status", type: "status", render: (row) => row?.status || "draft" },
    { key: "paymentDate", title: "Date", render: (row) => formatDate(row?.paymentDate || row?.createdAt) },
  ];

  const content = {
    overview: (
      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard title="Assigned delivery queue" description="Current dispatches/orders assigned to this driver or delivery role.">
          <DocumentTable columns={orderColumns} rows={orders.slice(0, 8)} emptyTitle="No assigned dispatches" emptyDescription="Assigned dispatches will appear here once orders are routed to this user." />
        </SectionCard>
        <SectionCard title="Quick actions" description="Jump into the working screens needed during delivery execution.">
          <div className="grid gap-3">
            <Link href="/dashboards/deliveryBoy/orders" className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4 transition hover:border-emerald-200 hover:bg-emerald-50">
              <div className="text-sm font-semibold text-zinc-900">Open POD desk</div>
              <div className="mt-1 text-xs text-zinc-600">Use the existing legacy page to upload proof of delivery and confirm receipt.</div>
            </Link>
            <Link href="/dashboards/deliveryBoy/day-plan" className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4 transition hover:border-emerald-200 hover:bg-emerald-50">
              <div className="text-sm font-semibold text-zinc-900">View day plan</div>
              <div className="mt-1 text-xs text-zinc-600">See route stop order, assigned customers, and visit priority.</div>
            </Link>
            <Link href="/dashboards/deliveryBoy/tracking" className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4 transition hover:border-emerald-200 hover:bg-emerald-50">
              <div className="text-sm font-semibold text-zinc-900">Check live tracking</div>
              <div className="mt-1 text-xs text-zinc-600">Review current online execution signals for delivery staff.</div>
            </Link>
          </div>
        </SectionCard>
      </div>
    ),
    "day-plan": (
      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard title="Route / day plan" description="Assigned customer stops generated from current dispatch workload.">
          <DocumentTable columns={routeColumns} rows={routePlanRows} emptyTitle="No day plan yet" emptyDescription="Assigned customer stops will show here once deliveries are allocated." />
        </SectionCard>
        <SectionCard title="Collection visibility" description="Receipt and invoice visibility for the same assigned customer base.">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"><div className="text-sm text-zinc-500">Customer invoices</div><div className="mt-2 text-2xl font-semibold text-zinc-950">{collectionSummary.invoiceCount}</div><div className="mt-2 text-xs text-zinc-500">Outstanding {formatCurrency(collectionSummary.invoiceOutstanding)}</div></div>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"><div className="text-sm text-zinc-500">Customer receipts</div><div className="mt-2 text-2xl font-semibold text-zinc-950">{collectionSummary.receiptCount}</div><div className="mt-2 text-xs text-zinc-500">Collected {formatCurrency(collectionSummary.receiptAmount)}</div></div>
          </div>
        </SectionCard>
      </div>
    ),
    dispatches: (
      <div className="space-y-5">
        <SectionCard title="Assigned dispatches" description="Delivery states, POD confirmation visibility, and receipt agreement posture.">
          <DocumentTable columns={orderColumns} rows={orders} emptyTitle="No dispatches assigned" emptyDescription="Assigned delivery work will appear here when dispatches/orders are allocated to this role." />
        </SectionCard>
        <SectionCard title="Legacy action screen" description="Continue using the existing POD desk for proof upload and receipt confirmation actions.">
          <Link href="/dashboards/deliveryBoy/orders" className="inline-flex rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700">Open POD desk</Link>
        </SectionCard>
      </div>
    ),
    tracking: (
      <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <SectionCard title="Live tracking visibility" description="Current live status for this delivery role and related delivery staff.">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"><div className="text-sm text-zinc-500">Tracked users</div><div className="mt-2 text-2xl font-semibold text-zinc-950">{liveRows.length}</div><div className="mt-2 text-xs text-zinc-500">Delivery-side users visible in live tracking</div></div>
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"><div className="text-sm text-zinc-500">Current profile</div><div className="mt-2 text-2xl font-semibold text-zinc-950">{me?.fullName || me?.username || "Driver"}</div><div className="mt-2 text-xs text-zinc-500">{me?.role || "Driver / Delivery"}</div></div>
          </div>
        </SectionCard>
        <SectionCard title="Live team snapshot" description="Recent online visibility from the live tracking stream.">
          <DocumentTable columns={liveColumns} rows={liveRows} emptyTitle="No live tracking rows" emptyDescription="Live updates will appear here once location data is available." />
        </SectionCard>
      </div>
    ),
    exceptions: (
      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard title="Exception reporting" description="Rejected, not agreed, or missing POD deliveries needing immediate follow-up.">
          <DocumentTable columns={orderColumns} rows={exceptionRows} emptyTitle="No exceptions right now" emptyDescription="Delivery exceptions will appear here when a customer rejects, disagrees, or POD is missing after delivery." />
        </SectionCard>
        <SectionCard title="Driver summary" description="Key delivery follow-up counts for this route cycle.">
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-2xl bg-zinc-50 px-4 py-3"><span className="text-sm text-zinc-600">Exceptions</span><StatusBadge value={String(deliveryStates.exceptions)} tone="unpaid" /></div>
            <div className="flex items-center justify-between rounded-2xl bg-zinc-50 px-4 py-3"><span className="text-sm text-zinc-600">POD pending</span><StatusBadge value={String(deliveryStates.podPending)} tone="pending" /></div>
            <div className="flex items-center justify-between rounded-2xl bg-zinc-50 px-4 py-3"><span className="text-sm text-zinc-600">Receipt confirmed</span><StatusBadge value={String(deliveryStates.confirmed)} tone="approved" /></div>
            <div className="flex items-center justify-between rounded-2xl bg-zinc-50 px-4 py-3"><span className="text-sm text-zinc-600">Receipts visible</span><StatusBadge value={String(collectionSummary.receiptCount)} tone="info" /></div>
          </div>
        </SectionCard>
      </div>
    ),
  };

  return (
    <UserDashboardShell
      title="Driver / Delivery Dashboard"
      subtitle="Manage routes, assigned dispatches, POD confirmation, live tracking, and delivery exceptions from one shared workspace."
      roleKey="Driver / Delivery"
      links={userDashboardSearchItems.deliveryBoy || []}
      showAccountCards
    >
      <div className="space-y-5">
        <PageHeader
          eyebrow="Driver / Delivery"
          title="Delivery execution command center"
          description="A dedicated delivery workspace for assigned routes, dispatch states, POD visibility, live tracking, and exception handling."
          actions={(
            <>
              <button type="button" onClick={loadWorkspace} className="rounded-2xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">Refresh workspace</button>
              <Link href="/dashboards/deliveryBoy/orders" className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">Open POD desk</Link>
            </>
          )}
        />

        {error ? <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div> : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {overviewCards.map((card) => (
            <SectionCard key={card.label} className="bg-gradient-to-br from-white to-zinc-50">
              <div className="text-sm font-medium text-zinc-500">{card.label}</div>
              <div className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">{card.value}</div>
              <div className="mt-2 text-xs text-zinc-500">{card.note}</div>
            </SectionCard>
          ))}
        </div>

        <ModuleCardStrip items={SECTION_ITEMS} activeKey={activeSection.key} onSelect={setActiveSection} />
        {loading ? <EmptyState title="Loading delivery workspace" description="Fetching assigned dispatches, route plan, receipt visibility, and live tracking signals." /> : content[activeSection.key]}
      </div>
    </UserDashboardShell>
  );
}
