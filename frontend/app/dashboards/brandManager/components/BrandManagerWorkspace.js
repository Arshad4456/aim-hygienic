"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import PageHeader from "../../../components/foundation/PageHeader";
import SectionCard from "../../../components/foundation/SectionCard";
import DocumentTable from "../../../components/foundation/DocumentTable";
import EmptyState from "../../../components/foundation/EmptyState";
import { v2Api } from "../../../lib/api";

function safeNumber(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value) {
  return `PKR ${safeNumber(value).toLocaleString()}`;
}

function formatNumber(value) {
  return safeNumber(value).toLocaleString();
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function BrandManagerWorkspace() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [overview, setOverview] = useState(null);
  const [orders, setOrders] = useState([]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [overviewRes, ordersRes] = await Promise.allSettled([
        v2Api.dashboard.overview(),
        v2Api.orders.list({ family: "company_supply" }),
      ]);
      if (overviewRes.status === "fulfilled") setOverview(overviewRes.value || null);
      if (ordersRes.status === "fulfilled") setOrders(Array.isArray(ordersRes.value?.orders) ? ordersRes.value.orders : []);
      const failure = [overviewRes, ordersRes].find((item) => item.status === "rejected");
      if (failure) setError(failure.reason?.message || "Some dashboard signals could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const cards = [
    { label: "Primary sale orders", value: formatNumber(orders.length), note: "Direct brand/channel company-side orders in current scope." },
    { label: "Revenue pulse", value: formatCurrency(overview?.kpis?.totalRevenue), note: "Shared company revenue signal to help direct channel planning." },
    { label: "Products", value: formatNumber(overview?.modules?.products), note: "Products available to support brand-side planning." },
    { label: "Returns", value: formatNumber(overview?.modules?.returns), note: "Return and claim signals requiring direct-channel follow-up." },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Brand Manager"
        title="Brand channel command center"
        description="Use this dashboard to review direct brand-channel activity, move to primary order requests, monitor returns, and stay linked to company supply operations."
        actions={(
          <>
            <button type="button" onClick={load} className="rounded-2xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">Refresh</button>
            <Link href="/dashboards/brandManager/primary-order-request" className="rounded-2xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600">Primary Order Request</Link>
          </>
        )}
      />

      {error ? <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <SectionCard key={card.label} className="bg-gradient-to-br from-white to-amber-50">
            <div className="text-sm font-medium text-zinc-500">{card.label}</div>
            <div className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">{card.value}</div>
            <div className="mt-2 text-xs text-zinc-500">{card.note}</div>
          </SectionCard>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard title="Recent direct-channel orders" description="Latest company-side primary sale orders relevant to the brand channel planning layer.">
          {loading ? (
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-8 text-sm text-zinc-500">Loading brand dashboard...</div>
          ) : (
            <DocumentTable
              columns={[
                { key: "documentNo", title: "Order" },
                { key: "distributor", title: "Linked party", render: (row) => row?.distributor?.partyName || row?.distributorId || "-" },
                { key: "total", title: "Value", render: (row) => formatCurrency(row?.totals?.grandTotal) },
                { key: "status", title: "Status", type: "status" },
                { key: "updatedAt", title: "Updated", render: (row) => formatDate(row?.updatedAt || row?.createdAt) },
              ]}
              rows={orders.slice(0, 8)}
              emptyTitle="No direct-channel orders"
              emptyDescription="Primary/company sale orders will appear here once this channel starts posting transactions."
            />
          )}
        </SectionCard>

        <SectionCard title="Quick navigation" description="Open the working modules behind brand planning and execution.">
          <div className="grid gap-3">
            {[
              { title: "Primary Order Request", href: "/dashboards/brandManager/primary-order-request", note: "Request direct-channel stock or supply from company." },
              { title: "Primary Sale Orders", href: "/dashboards/brandManager/orders", note: "Review primary sale order records connected to the brand role." },
              { title: "Return Stock", href: "/dashboards/brandManager/return-stock", note: "Watch return and damaged stock workflow for direct channels." },
              { title: "Messages", href: "/dashboards/brandManager/messages", note: "Stay connected with company teams around channel actions." },
            ].map((item) => (
              <Link key={item.href} href={item.href} className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-amber-200 hover:bg-amber-50">
                <div className="text-sm font-semibold text-zinc-900">{item.title}</div>
                <div className="mt-2 text-sm text-zinc-600">{item.note}</div>
              </Link>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
