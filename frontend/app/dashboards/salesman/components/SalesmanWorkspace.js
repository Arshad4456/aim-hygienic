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
  { key: "overview", title: "Overview", description: "Day plan, deliveries, customers, collections, and visit execution in one place." },
  { key: "day-plan", title: "Route / Day Plan", description: "Planned stops, field coverage, and delivery priorities for the day." },
  { key: "customers", title: "Assigned Customers", description: "Customers assigned through field, salesman, or current order relationships." },
  { key: "deliveries", title: "Assigned Deliveries", description: "Delivery confirmation, dispatch readiness, and POD workflow." },
  { key: "collections", title: "Collections", description: "Customer outstanding, receipts, and recovery visibility." },
  { key: "visits", title: "Visit Status", description: "Visited today, pending visits, and delivery-led visit signals." },
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

export default function SalesmanWorkspace({ initialSection = "overview" }) {
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
  const [deliveries, setDeliveries] = useState([]);
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
      v2Api.salesman.listAssignedOrders(),
      v2Api.salesman.listAssignedDeliveries(),
      v2Api.salesman.listCustomers({ companyId }),
      v2Api.salesman.listCustomerInvoices(),
      v2Api.salesman.listCustomerReceipts(),
      v2Api.salesman.listLiveUsers(),
    ]);

    const [ordersRes, deliveriesRes, customersRes, invoicesRes, receiptsRes, liveRes] = responses;
    const scopedOrders = ordersRes.status === "fulfilled" ? normalizeRows(ordersRes.value, "orders") : [];
    if (ordersRes.status === "fulfilled") setOrders(scopedOrders);
    if (deliveriesRes.status === "fulfilled") {
      setDeliveries(normalizeRows(deliveriesRes.value, "orders"));
    } else {
      setDeliveries(scopedOrders.filter((row) => ["approved", "dispatched", "delivered"].includes(String(row?.status || row?.dispatchStatus || "").toLowerCase())));
    }
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

  const assignedCustomers = useMemo(() => {
    const rows = Array.isArray(customers) ? customers : [];
    const fallbackCustomerIds = new Set([
      ...orders.map((row) => String(row?.customer?.partyId || "")).filter(Boolean),
      ...deliveries.map((row) => String(row?._id || row?.customerId || row?.customer?.partyId || "")).filter(Boolean),
    ]);

    const filtered = rows.filter((row) => {
      const rowSalesmanId = String(row?.salesmanId || row?.salesmanUserId || row?.salesman || "").trim();
      const rowFieldId = String(row?.fieldId || "").trim();
      const rowTerritoryId = String(row?.territoryId || "").trim();
      const rowId = String(row?._id || row?.userId || row?.uid || "").trim();
      return (
        (uid && rowSalesmanId && rowSalesmanId === uid) ||
        (fieldId && rowFieldId && rowFieldId === fieldId) ||
        (territoryId && rowTerritoryId && rowTerritoryId === territoryId) ||
        fallbackCustomerIds.has(rowId)
      );
    });

    return filtered.length ? filtered : rows.filter((row) => {
      const rowFieldId = String(row?.fieldId || "").trim();
      return fieldId && rowFieldId === fieldId;
    });
  }, [customers, deliveries, fieldId, orders, territoryId, uid]);

  const assignedCustomerIds = useMemo(
    () => new Set(assignedCustomers.map((row) => String(row?._id || row?.userId || row?.uid || "")).filter(Boolean)),
    [assignedCustomers],
  );

  const filteredInvoices = useMemo(() => {
    return customerInvoices.filter((row) => assignedCustomerIds.has(String(row?.customer?.partyId || "")));
  }, [assignedCustomerIds, customerInvoices]);

  const filteredReceipts = useMemo(() => {
    return customerReceipts.filter((row) => assignedCustomerIds.has(String(row?.customer?.partyId || "")));
  }, [assignedCustomerIds, customerReceipts]);

  const todayPlanRows = useMemo(() => {
    return assignedCustomers.map((customer) => {
      const customerId = String(customer?._id || customer?.userId || customer?.uid || "");
      const customerDeliveries = deliveries.filter((row) => String(row?.customerId || row?.customer?.partyId || row?._id || "") === customerId || String(row?.customerName || "") === String(customer?.fullName || customer?.businessName || customer?.username || ""));
      const latestOrder = orders.find((row) => String(row?.customer?.partyId || "") === customerId);
      const latestReceipt = filteredReceipts.find((row) => String(row?.customer?.partyId || "") === customerId);
      const area = customer?.areaName || customer?.territoryName || customer?.address || "Unassigned area";
      return {
        _id: customerId,
        customerName: customer?.fullName || customer?.businessName || customer?.username || "Customer",
        area,
        stopType: customerDeliveries.length ? "delivery + visit" : latestOrder ? "order follow-up" : "visit",
        deliveries: customerDeliveries.length,
        latestActionAt: latestReceipt?.paymentDate || latestOrder?.updatedAt || customer?.updatedAt || customer?.createdAt,
      };
    }).sort((a, b) => String(a.area).localeCompare(String(b.area)) || new Date(b.latestActionAt || 0) - new Date(a.latestActionAt || 0));
  }, [assignedCustomers, deliveries, filteredReceipts, orders]);

  const visitRows = useMemo(() => {
    return assignedCustomers.map((customer) => {
      const customerId = String(customer?._id || customer?.userId || customer?.uid || "");
      const latestOrder = orders.find((row) => String(row?.customer?.partyId || "") === customerId);
      const latestReceipt = filteredReceipts.find((row) => String(row?.customer?.partyId || "") === customerId);
      const todaysDelivery = deliveries.find((row) => (String(row?.customerId || row?.customer?.partyId || row?._id || "") === customerId || String(row?.customerName || "") === String(customer?.fullName || customer?.businessName || customer?.username || "")) && isToday(row?.updatedAt || row?.createdAt));

      let visitStatus = "planned";
      if (isToday(latestOrder?.updatedAt || latestOrder?.createdAt) || isToday(latestReceipt?.paymentDate || latestReceipt?.createdAt) || todaysDelivery) visitStatus = "visited";
      else if (deliveries.some((row) => String(row?.customerId || row?.customer?.partyId || row?._id || "") === customerId || String(row?.customerName || "") === String(customer?.fullName || customer?.businessName || customer?.username || ""))) visitStatus = "pending delivery";

      return {
        _id: customerId,
        customerName: customer?.fullName || customer?.businessName || customer?.username || "Customer",
        address: customer?.address || customer?.territoryName || customer?.areaName || "-",
        visitStatus,
        lastActivity: latestReceipt?.paymentDate || latestOrder?.updatedAt || customer?.updatedAt || customer?.createdAt,
      };
    });
  }, [assignedCustomers, deliveries, filteredReceipts, orders]);

  const outstandingValue = useMemo(() => filteredInvoices.reduce((sum, row) => sum + safeNumber(row?.balanceAmount || row?.invoiceTotal), 0), [filteredInvoices]);
  const collectedValue = useMemo(() => filteredReceipts.reduce((sum, row) => sum + safeNumber(row?.amount), 0), [filteredReceipts]);
  const pendingPodCount = useMemo(() => deliveries.filter((row) => !row?.podUrl).length, [deliveries]);
  const visitedTodayCount = useMemo(() => visitRows.filter((row) => row.visitStatus === "visited").length, [visitRows]);
  const onlineTracked = useMemo(() => liveUsers.filter((row) => String(row?.userId || row?.uid || "") === uid || String(row?.fieldId || "") === fieldId).length, [liveUsers, uid, fieldId]);

  const heroCards = [
    { label: "Assigned customers", value: assignedCustomers.length.toLocaleString(), note: `${fieldName || "Field"} customer network assigned to this salesman.` },
    { label: "Assigned deliveries", value: deliveries.length.toLocaleString(), note: `${pendingPodCount} deliveries still need POD upload.` },
    { label: "Collection visibility", value: formatCurrency(collectedValue), note: `${formatCurrency(outstandingValue)} customer outstanding in current scope.` },
    { label: "Visit status", value: visitedTodayCount.toLocaleString(), note: `${onlineTracked} live-tracked field signals active right now.` },
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

  const visitColumns = [
    { key: "customerName", title: "Customer" },
    { key: "address", title: "Address / Area" },
    { key: "visitStatus", title: "Visit status", type: "status" },
    { key: "lastActivity", title: "Last activity", render: (row) => formatDate(row?.lastActivity) },
  ];

  const contentBySection = {
    overview: (
      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard title="Today's route plan" description="Planned customer touches based on your assigned field, deliveries, and recent activity.">
          <DocumentTable
            columns={[
              { key: "customerName", title: "Customer" },
              { key: "area", title: "Area / Route" },
              { key: "stopType", title: "Stop type", type: "status", render: (row) => row?.stopType || "visit" },
              { key: "deliveries", title: "Deliveries" },
              { key: "latestActionAt", title: "Last action", render: (row) => formatDate(row?.latestActionAt) },
            ]}
            rows={todayPlanRows.slice(0, 8)}
            emptyTitle="No day plan yet"
            emptyDescription="Assigned customers and delivery stops will show here once the salesman is linked to customers and orders."
          />
        </SectionCard>
        <SectionCard title="Quick actions" description="Move straight into the most important field execution modules.">
          <div className="grid gap-3">
            {[
              { title: "Open deliveries", href: "/dashboards/salesman/deliveries", note: "Dispatch, confirm, and upload POD for assigned deliveries." },
              { title: "Assigned customers", href: "/dashboards/salesman/customers", note: "Review customers mapped to your field or salesman assignment." },
              { title: "Collections", href: "/dashboards/salesman/collections", note: "See receipts and customer outstanding before visiting." },
              { title: "Visit status", href: "/dashboards/salesman/visits", note: "Track visited vs pending customer stops for today." },
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
      <SectionCard title="Route / day plan" description="Planned stops and touchpoints for this salesman based on assigned customers and delivery workload.">
        <DocumentTable columns={[
          { key: "customerName", title: "Customer" },
          { key: "area", title: "Area / Route" },
          { key: "stopType", title: "Stop type", type: "status", render: (row) => row?.stopType || "visit" },
          { key: "deliveries", title: "Deliveries" },
          { key: "latestActionAt", title: "Last action", render: (row) => formatDate(row?.latestActionAt) },
        ]} rows={todayPlanRows} emptyTitle="No day plan" emptyDescription="Assigned customers, orders, and deliveries will build the day plan automatically." />
      </SectionCard>
    ),
    customers: (
      <SectionCard title="Assigned customers" description="Customers linked by salesman, field, territory, or current order relationship.">
        <DocumentTable columns={customerColumns} rows={assignedCustomers} emptyTitle="No assigned customers" emptyDescription="Link customers to the salesman or field to populate this list." />
      </SectionCard>
    ),
    deliveries: (
      <div className="space-y-5">
        <SectionCard title="Delivery execution summary" description="Assigned deliveries, confirmation visibility, and POD readiness for the current salesman scope.">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Assigned deliveries" value={deliveries.length.toLocaleString()} note="Orders currently in your delivery workload." />
            <MetricCard label="Pending POD" value={pendingPodCount.toLocaleString()} note="Deliveries without proof of delivery yet." />
            <MetricCard label="Dispatched" value={deliveries.filter((row) => String(row?.status || row?.dispatchStatus || "").toLowerCase() === "dispatched").length.toLocaleString()} note="Orders already moved into the field." />
            <MetricCard label="Delivered" value={deliveries.filter((row) => String(row?.status || row?.dispatchStatus || "").toLowerCase() === "delivered").length.toLocaleString()} note="Completed customer drop-offs." />
          </div>
        </SectionCard>
        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <SectionCard title="Assigned deliveries" description="This is your current delivery queue with confirmation and POD visibility.">
            <DocumentTable columns={[
              { key: "documentNo", title: "Order", render: (row) => row?.documentNo || row?.orderNo || row?.invoiceNo || "-" },
              { key: "customerName", title: "Customer", render: (row) => row?.customerName || row?.customer?.partyName || row?.businessName || "Customer" },
              { key: "address", title: "Address", render: (row) => row?.address || row?.territoryName || row?.areaName || "-" },
              { key: "status", title: "Delivery", type: "status", render: (row) => row?.dispatchStatus || row?.status || "pending" },
              { key: "pod", title: "POD", render: (row) => <StatusBadge value={row?.podUrl ? "uploaded" : "pending"} tone={row?.podUrl ? "approved" : "pending"} /> },
              { key: "updatedAt", title: "Updated", render: (row) => formatDate(row?.updatedAt || row?.createdAt) },
            ]} rows={deliveries.slice(0, 14)} emptyTitle="No deliveries assigned" emptyDescription="Approved or dispatched salesman deliveries will appear here." />
          </SectionCard>
          <SectionCard title="Delivery actions" description="Use the action page for camera/POD workflows and legacy delivery actions that already exist in your project.">
            <div className="space-y-3">
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4 text-sm text-zinc-700">
                Use the legacy deliveries action page when you need direct delivery confirmation or POD upload controls tied to the older action module.
              </div>
              <Link href="/dashboards/salesman/orders" className="inline-flex rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700">
                Open delivery action page
              </Link>
            </div>
          </SectionCard>
        </div>
      </div>
    ),
    collections: (
      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <SectionCard title="Collection visibility" description="Outstanding invoice pressure and recent customer receipts within this salesman scope.">
          <div className="grid gap-4 md:grid-cols-2">
            <MetricCard label="Outstanding" value={formatCurrency(outstandingValue)} note="Open customer balance across assigned accounts." />
            <MetricCard label="Collected" value={formatCurrency(collectedValue)} note="Posted customer receipts visible in this salesman scope." />
            <MetricCard label="Open invoices" value={filteredInvoices.length.toLocaleString()} note="Invoices still carrying balance pressure." />
            <MetricCard label="Receipts" value={filteredReceipts.length.toLocaleString()} note="Recent receipt activity ready for follow-up." />
          </div>
        </SectionCard>
        <SectionCard title="Recent customer receipts" description="Latest collection activity for assigned customers.">
          <DocumentTable columns={receiptColumns} rows={filteredReceipts.slice(0, 12)} emptyTitle="No receipts found" emptyDescription="Receipts posted for assigned customers will appear here." />
        </SectionCard>
        <SectionCard title="Open customer invoices" description="Outstanding invoice list that drives your daily collection visits.">
          <DocumentTable columns={invoiceColumns} rows={filteredInvoices.slice(0, 12)} emptyTitle="No customer invoices found" emptyDescription="Assigned customer invoices will appear here after billing." />
        </SectionCard>
      </div>
    ),
    visits: (
      <SectionCard title="Visit status" description="Shows visited today, pending delivery, and planned visits based on order, receipt, and delivery activity.">
        <DocumentTable columns={visitColumns} rows={visitRows} emptyTitle="No visit map available" emptyDescription="Assign customers, orders, and deliveries to build the visit status board." />
      </SectionCard>
    ),
  };

  return (
    <UserDashboardShell
      title="Salesman Dashboard"
      subtitle="Route plan, customers, deliveries, POD, collections, and visit execution from one V2-first workspace."
      roleKey="Salesman"
      links={userDashboardSearchItems.salesman || []}
      showAccountCards
    >
      <div className="space-y-5">
        <PageHeader
          eyebrow="Salesman"
          title="Field execution command center"
          description="Use this workspace to manage your route/day plan, assigned customers, deliveries, proof of delivery, collection visibility, and visit status."
          actions={
            <>
              <button type="button" onClick={loadWorkspace} className="rounded-2xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50">
                Refresh workspace
              </button>
              <Link href="/dashboards/salesman/deliveries" className="rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700">
                Open deliveries
              </Link>
            </>
          }
        />

        {error ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div>
        ) : null}

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
          <div className="rounded-3xl border border-zinc-200 bg-white px-4 py-10 text-center text-sm text-zinc-500 shadow-sm">Loading salesman workspace…</div>
        ) : (
          contentBySection[activeSection.key] || <EmptyState title="Section unavailable" description="This salesman section will appear here once its data is ready." />
        )}
      </div>
    </UserDashboardShell>
  );
}

function MetricCard({ label, value, note }) {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-zinc-50 px-4 py-4">
      <div className="text-sm font-medium text-zinc-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">{value}</div>
      <div className="mt-2 text-xs text-zinc-500">{note}</div>
    </div>
  );
}
