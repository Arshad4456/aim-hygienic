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
  { key: "overview", title: "Overview", description: "Day plan, customers, order visibility, collections, and visit execution in one place." },
  { key: "day-plan", title: "Day Plan", description: "Planned stops, customer follow-up, and order-creation priorities for the day." },
  { key: "customers", title: "Assigned Customers", description: "Customers assigned through field, order booker mapping, or current order relationships." },
  { key: "order-status", title: "Order Status", description: "Order creation visibility, created order flow, and status tracking." },
  { key: "collections", title: "Collections", description: "Customer outstanding, receipts, and recovery visibility." },
  { key: "visits", title: "Visit Status", description: "Visited today, pending visits, and order-follow-up visit signals." },
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

function startOfToday() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

function isToday(value) {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date >= startOfToday();
}

function orderBookerMatch(row, uid, fieldId, territoryId) {
  const rowOrderBookerId = String(row?.orderBookerId || row?.orderBookerUserId || row?.orderbookerId || row?.createdByUserId || row?.createdBy || "").trim();
  const rowSource = String(row?.source || row?.sourceType || row?.requestedByRole || "").trim().toLowerCase();
  const rowFieldId = String(row?.fieldId || row?.customer?.fieldId || "").trim();
  const rowTerritoryId = String(row?.territoryId || row?.customer?.territoryId || "").trim();
  return (
    (uid && rowOrderBookerId && rowOrderBookerId === uid) ||
    rowSource.includes("orderbooker") || rowSource.includes("order booker") ||
    (fieldId && rowFieldId && rowFieldId === fieldId) ||
    (territoryId && rowTerritoryId && rowTerritoryId === territoryId)
  );
}

export default function OrderBookerWorkspace({ initialSection = "overview" }) {
  const auth = useMemo(() => getAuthSnapshot(), []);
  const uid = String(auth?.user?.userId || auth?.payload?.uid || auth?.user?.uid || "").trim();
  const fieldId = String(auth?.user?.fieldId || auth?.payload?.fieldId || "").trim();
  const territoryId = String(auth?.user?.territoryId || auth?.payload?.territoryId || "").trim();
  const fieldName = String(auth?.user?.fieldName || auth?.payload?.fieldName || "").trim();
  const companyId = String(auth?.user?.companyId || auth?.payload?.companyId || "").trim();

  const [activeSection, setActiveSection] = useState(() => SECTION_ITEMS.find((item) => item.key === initialSection) || SECTION_ITEMS[0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [customerInvoices, setCustomerInvoices] = useState([]);
  const [customerReceipts, setCustomerReceipts] = useState([]);
  const [liveUsers, setLiveUsers] = useState([]);

  useEffect(() => {
    const matched = SECTION_ITEMS.find((item) => item.key === initialSection);
    if (matched) setActiveSection(matched);
  }, [initialSection]);

  async function loadWorkspace() {
    setLoading(true);
    setError("");

    const responses = await Promise.allSettled([
      v2Api.orderBooker.listOrders(),
      v2Api.orderBooker.listCustomers({ companyId }),
      v2Api.orderBooker.listCustomerInvoices(),
      v2Api.orderBooker.listCustomerReceipts(),
      v2Api.orderBooker.listLiveUsers(),
    ]);

    const [ordersRes, customersRes, invoicesRes, receiptsRes, liveRes] = responses;
    if (ordersRes.status === "fulfilled") setOrders(normalizeRows(ordersRes.value, "orders"));
    if (customersRes.status === "fulfilled") setCustomers(normalizeRows(customersRes.value, "users"));
    if (invoicesRes.status === "fulfilled") setCustomerInvoices(normalizeRows(invoicesRes.value, "invoices"));
    if (receiptsRes.status === "fulfilled") setCustomerReceipts(normalizeRows(receiptsRes.value, "receipts"));
    if (liveRes.status === "fulfilled") setLiveUsers(Array.isArray(liveRes.value?.data?.items) ? liveRes.value.data.items : []);

    const criticalFailure = [ordersRes, customersRes].find((item) => item.status === "rejected");
    if (criticalFailure?.reason?.message) setError(criticalFailure.reason.message);
    setLoading(false);
  }

  useEffect(() => {
    loadWorkspace();
  }, []);

  const visibleOrders = useMemo(() => {
    return orders.filter((row) => orderBookerMatch(row, uid, fieldId, territoryId));
  }, [orders, uid, fieldId, territoryId]);

  const assignedCustomers = useMemo(() => {
    const rows = Array.isArray(customers) ? customers : [];
    const fallbackCustomerIds = new Set(visibleOrders.map((row) => String(row?.customer?.partyId || row?.customerId || row?.selectedCustomer || "")).filter(Boolean));

    const filtered = rows.filter((row) => {
      const rowOrderBookerId = String(row?.orderBookerId || row?.orderBookerUserId || row?.orderbookerId || "").trim();
      const rowFieldId = String(row?.fieldId || "").trim();
      const rowTerritoryId = String(row?.territoryId || "").trim();
      const rowId = String(row?._id || row?.userId || row?.uid || "").trim();
      return (
        (uid && rowOrderBookerId && rowOrderBookerId === uid) ||
        (fieldId && rowFieldId && rowFieldId === fieldId) ||
        (territoryId && rowTerritoryId && rowTerritoryId === territoryId) ||
        fallbackCustomerIds.has(rowId)
      );
    });

    return filtered.length
      ? filtered
      : rows.filter((row) => {
          const rowFieldId = String(row?.fieldId || "").trim();
          return fieldId && rowFieldId === fieldId;
        });
  }, [customers, fieldId, territoryId, uid, visibleOrders]);

  const assignedCustomerIds = useMemo(
    () => new Set(assignedCustomers.map((row) => String(row?._id || row?.userId || row?.uid || "")).filter(Boolean)),
    [assignedCustomers],
  );

  const filteredInvoices = useMemo(
    () => customerInvoices.filter((row) => assignedCustomerIds.has(String(row?.customer?.partyId || row?.customerId || ""))),
    [assignedCustomerIds, customerInvoices],
  );

  const filteredReceipts = useMemo(
    () => customerReceipts.filter((row) => assignedCustomerIds.has(String(row?.customer?.partyId || row?.customerId || ""))),
    [assignedCustomerIds, customerReceipts],
  );

  const todayPlanRows = useMemo(() => {
    return assignedCustomers
      .map((customer) => {
        const customerId = String(customer?._id || customer?.userId || customer?.uid || "");
        const customerOrders = visibleOrders.filter((row) => String(row?.customer?.partyId || row?.customerId || row?.selectedCustomer || "") === customerId);
        const latestOrder = customerOrders[0];
        const latestReceipt = filteredReceipts.find((row) => String(row?.customer?.partyId || row?.customerId || "") === customerId);
        const area = customer?.areaName || customer?.territoryName || customer?.address || "Unassigned area";
        return {
          _id: customerId,
          customerName: customer?.fullName || customer?.businessName || customer?.username || "Customer",
          area,
          stopType: customerOrders.length ? "order follow-up" : latestReceipt ? "collection follow-up" : "visit",
          orders: customerOrders.length,
          latestActionAt: latestReceipt?.paymentDate || latestOrder?.updatedAt || customer?.updatedAt || customer?.createdAt,
        };
      })
      .sort((a, b) => String(a.area).localeCompare(String(b.area)) || new Date(b.latestActionAt || 0) - new Date(a.latestActionAt || 0));
  }, [assignedCustomers, filteredReceipts, visibleOrders]);

  const visitRows = useMemo(() => {
    return assignedCustomers.map((customer) => {
      const customerId = String(customer?._id || customer?.userId || customer?.uid || "");
      const latestOrder = visibleOrders.find((row) => String(row?.customer?.partyId || row?.customerId || row?.selectedCustomer || "") === customerId);
      const latestReceipt = filteredReceipts.find((row) => String(row?.customer?.partyId || row?.customerId || "") === customerId);

      let visitStatus = "planned";
      if (isToday(latestOrder?.updatedAt || latestOrder?.createdAt) || isToday(latestReceipt?.paymentDate || latestReceipt?.createdAt)) visitStatus = "visited";
      else if (latestOrder) visitStatus = "order follow-up";
      else if (filteredInvoices.some((row) => String(row?.customer?.partyId || row?.customerId || "") === customerId && safeNumber(row?.balanceAmount || row?.invoiceTotal) > 0)) visitStatus = "collection pending";

      return {
        _id: customerId,
        customerName: customer?.fullName || customer?.businessName || customer?.username || "Customer",
        address: customer?.address || customer?.territoryName || customer?.areaName || "-",
        visitStatus,
        lastActivity: latestReceipt?.paymentDate || latestOrder?.updatedAt || customer?.updatedAt || customer?.createdAt,
      };
    });
  }, [assignedCustomers, filteredInvoices, filteredReceipts, visibleOrders]);

  const outstandingValue = useMemo(() => filteredInvoices.reduce((sum, row) => sum + safeNumber(row?.balanceAmount || row?.invoiceTotal), 0), [filteredInvoices]);
  const collectedValue = useMemo(() => filteredReceipts.reduce((sum, row) => sum + safeNumber(row?.amount), 0), [filteredReceipts]);
  const createdOrdersCount = visibleOrders.length;
  const pendingOrdersCount = useMemo(() => visibleOrders.filter((row) => !["approved", "delivered", "completed"].includes(String(row?.status || "").toLowerCase())).length, [visibleOrders]);
  const visitedTodayCount = useMemo(() => visitRows.filter((row) => row.visitStatus === "visited").length, [visitRows]);
  const onlineTracked = useMemo(() => liveUsers.filter((row) => {
    const role = String(row?.role || '').toLowerCase();
    return (String(row?.userId || row?.uid || '') === uid) || ((role.includes('order') || role.includes('sales')) && String(row?.fieldId || '') === fieldId);
  }).length, [liveUsers, uid, fieldId]);

  const heroCards = [
    { label: "Assigned customers", value: assignedCustomers.length.toLocaleString(), note: `${fieldName || "Field"} customer network assigned to this order booker.` },
    { label: "Order visibility", value: createdOrdersCount.toLocaleString(), note: `${pendingOrdersCount} orders still moving through status flow.` },
    { label: "Collection visibility", value: formatCurrency(collectedValue), note: `${formatCurrency(outstandingValue)} customer outstanding in current scope.` },
    { label: "Visit status", value: visitedTodayCount.toLocaleString(), note: `${onlineTracked} live field signals active right now.` },
  ];

  const customerColumns = [
    { key: "customerName", title: "Customer", render: (row) => row?.fullName || row?.businessName || row?.username || "Customer" },
    { key: "territory", title: "Area / Territory", render: (row) => row?.areaName || row?.territoryName || row?.address || "-" },
    { key: "mobile", title: "Phone", render: (row) => row?.mobile || row?.phone || row?.phoneNumber || "-" },
    { key: "status", title: "Status", type: "status", render: (row) => row?.status || "active" },
  ];

  const receiptColumns = [
    { key: "documentNo", title: "Receipt" },
    { key: "customer", title: "Customer", render: (row) => row?.customer?.partyName || row?.customer?.partyCode || "Customer" },
    { key: "amount", title: "Amount", render: (row) => formatCurrency(row?.amount) },
    { key: "paymentMethod", title: "Method" },
    { key: "status", title: "Status", type: "status", render: (row) => row?.status || "pending" },
    { key: "paymentDate", title: "Date", render: (row) => formatDate(row?.paymentDate || row?.createdAt) },
  ];

  const invoiceColumns = [
    { key: "documentNo", title: "Invoice" },
    { key: "customer", title: "Customer", render: (row) => row?.customer?.partyName || row?.customer?.partyCode || "Customer" },
    { key: "invoiceTotal", title: "Invoice total", render: (row) => formatCurrency(row?.invoiceTotal || row?.totals?.grandTotal) },
    { key: "balanceAmount", title: "Balance", render: (row) => formatCurrency(row?.balanceAmount || row?.invoiceTotal) },
    { key: "paymentStatus", title: "Payment", type: "status", render: (row) => row?.paymentStatus || "unpaid" },
    { key: "dueDate", title: "Due", render: (row) => formatDate(row?.dueDate || row?.invoiceDate || row?.createdAt) },
  ];

  const orderColumns = [
    { key: "documentNo", title: "Order" },
    { key: "customer", title: "Customer", render: (row) => row?.customer?.partyName || row?.customerName || row?.selectedCustomerName || "Customer" },
    { key: "grandTotal", title: "Value", render: (row) => formatCurrency(row?.totals?.grandTotal || row?.invoiceTotal || row?.totalAmount) },
    { key: "status", title: "Order status", type: "status", render: (row) => row?.status || "draft" },
    { key: "dispatchStatus", title: "Dispatch", type: "status", render: (row) => row?.dispatchStatus || row?.deliveryStatus || "pending" },
    { key: "updatedAt", title: "Updated", render: (row) => formatDate(row?.updatedAt || row?.createdAt) },
  ];

  const visitColumns = [
    { key: "customerName", title: "Customer" },
    { key: "address", title: "Address / Area" },
    { key: "visitStatus", title: "Visit status", type: "status" },
    { key: "lastActivity", title: "Last activity", render: (row) => formatDate(row?.lastActivity) },
  ];

  const contentBySection = {
    overview: (
      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard title="Today's day plan" description="Planned customer stops based on your field, order visibility, and collection follow-up.">
          <DocumentTable
            columns={[
              { key: "customerName", title: "Customer" },
              { key: "area", title: "Area / Route" },
              { key: "stopType", title: "Stop type", type: "status", render: (row) => row?.stopType || "visit" },
              { key: "orders", title: "Orders" },
              { key: "latestActionAt", title: "Last action", render: (row) => formatDate(row?.latestActionAt) },
            ]}
            rows={todayPlanRows.slice(0, 8)}
            emptyTitle="No day plan yet"
            emptyDescription="Assigned customers and order follow-up stops will show here once the order booker is linked to customers and orders."
          />
        </SectionCard>
        <SectionCard title="Quick actions" description="Move straight into the most important order-booker execution modules.">
          <div className="grid gap-3">
            {[
              { title: "Create order (legacy)", href: "/portals/orderBooker/orders", note: "Open the current secondary order creation screen." },
              { title: "Assigned customers", href: "/portals/orderBooker/customers", note: "Review customers mapped to your field or order-booker assignment." },
              { title: "Collections", href: "/portals/orderBooker/collections", note: "See receipts and customer outstanding before visiting." },
              { title: "Visit status", href: "/portals/orderBooker/visits", note: "Track visited vs pending customer stops for today." },
              { title: "Receipts (legacy)", href: "/portals/orderBooker/receipts", note: "Open the current receipt entry screen." },
            ].map((item) => (
              <Link key={item.href} href={item.href} className="rounded-3xl border border-zinc-200 bg-zinc-50 px-4 py-4 transition hover:border-emerald-200 hover:bg-emerald-50">
                <div className="text-sm font-semibold text-zinc-900">{item.title}</div>
                <div className="mt-1 text-xs leading-5 text-zinc-600">{item.note}</div>
              </Link>
            ))}
          </div>
        </SectionCard>
      </div>
    ),
    "day-plan": (
      <SectionCard title="Day plan" description="Customer touch plan based on assigned territory, created orders, and recent recovery activity.">
        <DocumentTable
          columns={[
            { key: "customerName", title: "Customer" },
            { key: "area", title: "Area / Route" },
            { key: "stopType", title: "Focus", type: "status", render: (row) => row?.stopType || "visit" },
            { key: "orders", title: "Orders" },
            { key: "latestActionAt", title: "Last action", render: (row) => formatDate(row?.latestActionAt) },
          ]}
          rows={todayPlanRows}
          emptyTitle="No route/day plan yet"
          emptyDescription="The day plan appears when customers, orders, or receipts are tied to this order booker."
        />
      </SectionCard>
    ),
    customers: (
      <SectionCard title="Assigned customers" description="Customers mapped to your order-booker account, field, territory, or current order relationships.">
        <DocumentTable
          columns={customerColumns}
          rows={assignedCustomers}
          emptyTitle="No assigned customers yet"
          emptyDescription="Assign customers to the order booker or field hierarchy to populate this list."
        />
      </SectionCard>
    ),
    "order-status": (
      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard title="Order creation visibility" description="Recent secondary orders linked to this order booker, field, or territory.">
          <DocumentTable
            columns={orderColumns}
            rows={visibleOrders.slice(0, 12)}
            emptyTitle="No visible orders yet"
            emptyDescription="Orders created or assigned through this order booker will appear here."
          />
        </SectionCard>
        <SectionCard title="Order status snapshot" description="Keep an eye on draft, approved, and completed order flow before moving to deeper order-engine passes.">
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3"><span className="text-sm text-zinc-600">All visible orders</span><StatusBadge value={String(createdOrdersCount)} tone="approved" /></div>
            <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3"><span className="text-sm text-zinc-600">Pending movement</span><StatusBadge value={String(pendingOrdersCount)} tone="pending" /></div>
            <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3"><span className="text-sm text-zinc-600">Approved / closed</span><StatusBadge value={String(Math.max(createdOrdersCount - pendingOrdersCount, 0))} tone="approved" /></div>
            <Link href="/portals/orderBooker/orders" className="mt-3 inline-flex rounded-2xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800">Open legacy order creation</Link>
          </div>
        </SectionCard>
      </div>
    ),
    collections: (
      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <SectionCard title="Customer outstanding" description="Invoices linked to your assigned customers for recovery visibility during visits.">
          <DocumentTable
            columns={invoiceColumns}
            rows={filteredInvoices.slice(0, 12)}
            emptyTitle="No customer invoices yet"
            emptyDescription="Customer invoice visibility will appear here once distributor billing is posted."
          />
        </SectionCard>
        <SectionCard title="Customer receipts" description="Latest receipt activity related to your customer set.">
          <DocumentTable
            columns={receiptColumns}
            rows={filteredReceipts.slice(0, 12)}
            emptyTitle="No customer receipts yet"
            emptyDescription="Receipts posted for your customers will show here for collection follow-up."
          />
        </SectionCard>
      </div>
    ),
    visits: (
      <SectionCard title="Visit status" description="Track which customers were visited today and which still need follow-up.">
        <DocumentTable
          columns={visitColumns}
          rows={visitRows}
          emptyTitle="No visit status yet"
          emptyDescription="Visit tracking appears as order and receipt activity becomes available."
        />
      </SectionCard>
    ),
  };

  return (
    <UserDashboardShell
      title="Order Booker Dashboard"
      subtitle="Plan daily customer work, monitor created orders, see collections, and track visits from one shared workspace."
      roleKey="Order Booker"
      links={userDashboardSearchItems.orderBooker || []}
      showAccountCards
    >
      <div className="space-y-5">
        <PageHeader
          eyebrow="Order Booker"
          title="Order Booker command center"
          description="This shared workspace gives the order booker a V2-first view of route/day plan, assigned customers, order visibility, collections, and visit status."
          actions={
            <>
              <button
                type="button"
                onClick={loadWorkspace}
                className="rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Refresh workspace
              </button>
              <Link href="/portals/orderBooker/orders" className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
                Open order creation
              </Link>
            </>
          }
        />

        {error ? <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div> : null}

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
          <EmptyState title="Loading order-booker workspace" description="Fetching orders, assigned customers, receipts, invoices, and visit signals." />
        ) : (
          contentBySection[activeSection.key] || <EmptyState title="Section unavailable" description="This section is not available yet." />
        )}
      </div>
    </UserDashboardShell>
  );
}
