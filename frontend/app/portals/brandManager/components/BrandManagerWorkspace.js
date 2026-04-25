"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PageHeader from "../../../components/foundation/PageHeader";
import SectionCard from "../../../components/foundation/SectionCard";
import ModuleCardStrip from "../../../components/foundation/ModuleCardStrip";
import DocumentTable from "../../../components/foundation/DocumentTable";
import EmptyState from "../../../components/foundation/EmptyState";
import { v2Api } from "../../../lib/api";

const SECTION_ITEMS = [
  { key: "overview", title: "Direct-channel overview", description: "Brand-facing company sales pulse, direct-order value, and linked module readiness." },
  { key: "orders", title: "Primary sale visibility", description: "Company direct-channel order visibility for brand-linked sales and follow-up." },
  { key: "returns", title: "Return pressure", description: "Brand-side return visibility and fast entry into return workflows." },
  { key: "actions", title: "Linked modules", description: "Move quickly into messages, settings, requests, and direct-channel operational screens." },
];

function safeNumber(value) {
  const numeric = Number(value || 0);
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
  return Number.isNaN(date.getTime()) ? "-" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function BrandManagerWorkspace() {
  const [activeSection, setActiveSection] = useState(SECTION_ITEMS[0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [overview, setOverview] = useState(null);
  const [orders, setOrders] = useState([]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [overviewRes, ordersRes] = await Promise.all([
        v2Api.dashboard.overview(),
        v2Api.orders.list({ family: "company_supply" }),
      ]);
      setOverview(overviewRes || null);
      setOrders(Array.isArray(ordersRes?.orders) ? ordersRes.orders : []);
    } catch (err) {
      setError(err.message || "Failed to load brand manager workspace");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const directCards = useMemo(() => [
    { label: "Primary sale orders", value: formatNumber(orders.length), note: "Direct brand-facing company orders in current view." },
    { label: "Revenue pulse", value: formatCurrency(overview?.kpis?.totalRevenue), note: "Shared company revenue signal that supports direct brand channels." },
    { label: "Products", value: formatNumber(overview?.modules?.products), note: "Products available across company stock and direct-channel supply." },
    { label: "Return queue", value: formatNumber(overview?.modules?.returns), note: "Returns or claims needing direct-channel follow-up." },
  ], [orders.length, overview]);

  const recentOrders = useMemo(() => [...orders].sort((a, b) => new Date(b?.updatedAt || b?.createdAt || 0) - new Date(a?.updatedAt || a?.createdAt || 0)).slice(0, 10), [orders]);

  const quickActions = [
    { title: "Primary order request", href: "/portals/brandManager/primary-order-request", note: "Request direct-channel supply from company stock." },
    { title: "Return stock", href: "/portals/brandManager/return-stock", note: "Create and review direct-channel return requests." },
    { title: "Messages", href: "/portals/brandManager/messages", note: "Stay connected with company-side communication." },
    { title: "Account settings", href: "/portals/brandManager/settings", note: "Keep brand manager account and profile clean." },
  ];

  const orderColumns = [
    { key: "documentNo", title: "Order" },
    { key: "distributor", title: "Direct account / distributor", render: (row) => row?.distributor?.partyName || row?.distributorId || "Direct account" },
    { key: "grandTotal", title: "Value", render: (row) => formatCurrency(row?.totals?.grandTotal) },
    { key: "status", title: "Status", type: "status" },
    { key: "createdAt", title: "Created", render: (row) => formatDate(row?.createdAt) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Brand Manager"
        title="Direct-channel command center"
        description="Manage brand-linked company sales with a cleaner workspace for direct-channel orders, return pressure, and linked company modules."
        actions={
          <>
            <button type="button" onClick={load} className="rounded-2xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
              Refresh workspace
            </button>
            <Link href="/portals/brandManager/primary-order-request" className="rounded-2xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600">
              Request stock
            </Link>
          </>
        }
      />

      {error ? <div className="rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {directCards.map((card) => (
          <SectionCard key={card.label} className="bg-gradient-to-br from-amber-50 to-white">
            <div className="text-sm font-medium text-zinc-500">{card.label}</div>
            <div className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">{card.value}</div>
            <div className="mt-2 text-xs text-zinc-500">{card.note}</div>
          </SectionCard>
        ))}
      </div>

      <SectionCard title="Brand manager focus" description="Move between direct-channel visibility, return pressure, and linked company modules.">
        <ModuleCardStrip items={SECTION_ITEMS} activeKey={activeSection.key} onSelect={setActiveSection} />
      </SectionCard>

      {loading ? (
        <div className="rounded-3xl border border-zinc-200 bg-white px-4 py-10 text-center text-sm text-zinc-500 shadow-sm">
          Loading brand manager workspace…
        </div>
      ) : activeSection.key === "overview" ? (
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <SectionCard title="Recent direct-channel orders" description="Latest company sales orders relevant to brand-side visibility and follow-up.">
            {recentOrders.length ? (
              <DocumentTable columns={orderColumns} rows={recentOrders} emptyTitle="No direct orders" emptyDescription="Direct-channel orders will appear here once they are created in the company flow." />
            ) : (
              <EmptyState title="No direct orders yet" description="Direct-channel company sales will appear here once orders are created." />
            )}
          </SectionCard>
          <SectionCard title="Direct-channel notes" description="Use this summary to keep the brand-facing flow linked with the rest of the company panels.">
            <div className="space-y-3 text-sm text-zinc-700">
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">Direct-channel orders should stay linked with company stock, finance, dispatch, and returns.</div>
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">Brand Manager should use company procurement and warehouse signals indirectly, not duplicate them.</div>
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">Returns and messages stay important for direct brand account relationships.</div>
            </div>
          </SectionCard>
        </div>
      ) : activeSection.key === "orders" ? (
        <SectionCard title="Primary sale visibility" description="Direct-channel company order list for brand-facing coordination.">
          <DocumentTable columns={orderColumns} rows={recentOrders} emptyTitle="No direct orders" emptyDescription="Direct-channel orders will appear here once they are created." />
        </SectionCard>
      ) : activeSection.key === "returns" ? (
        <SectionCard title="Return pressure" description="Brand-side return exposure and quick navigation into the return flow.">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-zinc-200 bg-gradient-to-br from-white to-amber-50 px-4 py-4">
              <div className="text-sm font-medium text-zinc-500">Return queue</div>
              <div className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">{formatNumber(overview?.modules?.returns)}</div>
              <div className="mt-2 text-xs text-zinc-500">Use return stock for direct-channel claims and damaged stock follow-up.</div>
            </div>
            <Link href="/portals/brandManager/return-stock" className="rounded-3xl border border-zinc-200 bg-white px-4 py-4 shadow-sm transition hover:border-amber-200 hover:bg-amber-50">
              <div className="text-sm font-semibold text-zinc-900">Open return stock module</div>
              <div className="mt-2 text-sm text-zinc-600">Continue return creation, tracking, and approvals from the dedicated return-stock panel.</div>
            </Link>
          </div>
        </SectionCard>
      ) : (
        <SectionCard title="Linked modules" description="Open the connected modules Brand Manager should use during company-side review and execution.">
          <div className="grid gap-3 sm:grid-cols-2">
            {quickActions.map((item) => (
              <Link key={item.href} href={item.href} className="rounded-3xl border border-zinc-200 bg-gradient-to-br from-white to-amber-50 px-4 py-4 text-sm shadow-sm transition hover:border-amber-300 hover:from-amber-50 hover:to-white">
                <div className="font-semibold text-zinc-900">{item.title}</div>
                <div className="mt-1 text-xs leading-5 text-zinc-600">{item.note}</div>
              </Link>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}
