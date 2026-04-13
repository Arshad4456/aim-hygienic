"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { v2Api } from "../../../lib/api";
import EmptyState from "../../../components/foundation/EmptyState";
import ModuleCardStrip from "../../../components/foundation/ModuleCardStrip";
import PageHeader from "../../../components/foundation/PageHeader";
import SectionCard from "../../../components/foundation/SectionCard";
import DocumentTable from "../../../components/foundation/DocumentTable";

const MODULES = [
  { key: "overview", title: "Overview", description: "Assigned orders, POD readiness, and supplier finance snapshot." },
  { key: "orders", title: "Assigned primary orders", description: "Supplier-owned primary order queue and dispatch/POD visibility." },
  { key: "settlements", title: "Invoices & payments", description: "Supplier invoices, balances, and payment status." },
];

function money(value) {
  return `PKR ${Number(value || 0).toLocaleString()}`;
}

function fmt(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
}

export default function SupplierWorkspace() {
  const [activeModule, setActiveModule] = useState(MODULES[0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orders, setOrders] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [ordersData, receiptData, invoiceData, paymentData] = await Promise.all([
          v2Api.procurement.supplierPrimaryOrders(),
          v2Api.receipts.list({ family: "company_distributor" }).catch(() => ({ receipts: [] })),
          v2Api.procurement.supplierInvoices(),
          v2Api.procurement.supplierPayments(),
        ]);
        if (!active) return;
        setOrders(Array.isArray(ordersData?.transactions) ? ordersData.transactions : []);
        setReceipts(Array.isArray(receiptData?.receipts) ? receiptData.receipts : []);
        setInvoices(Array.isArray(invoiceData?.invoices) ? invoiceData.invoices : []);
        setPayments(Array.isArray(paymentData?.payments) ? paymentData.payments : []);
      } catch (err) {
        if (!active) return;
        setError(err.message || "Failed to load supplier workspace");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const metrics = useMemo(() => {
    const assigned = orders.length;
    const podPending = orders.filter((row) => !row?.proofOfDeliveryUrl && !row?.podUrl).length;
    const openInvoices = invoices.filter((row) => ["unpaid", "partial"].includes(String(row?.paymentStatus || "").toLowerCase())).length;
    const paidAmount = payments
      .filter((row) => ["approved", "posted"].includes(String(row?.status || "").toLowerCase()))
      .reduce((sum, row) => sum + Number(row?.amount || 0), 0);
    return { assigned, podPending, openInvoices, paidAmount };
  }, [invoices, orders, payments]);

  const content = useMemo(() => {
    if (loading) {
      return <EmptyState title="Loading supplier dashboard" description="Fetching assigned primary orders, invoice status, and POD readiness." />;
    }
    if (error) {
      return <EmptyState title="Supplier dashboard failed to load" description={error} />;
    }

    if (activeModule.key === "orders") {
      return (
        <SectionCard title="Assigned primary orders" description="This queue is the supplier-facing execution list. Open the detailed page to upload POD and review linked receipts.">
          <DocumentTable
            rows={orders}
            columns={[
              { key: "transactionCode", title: "Order ref" },
              { key: "requestStatus", title: "Status", type: "status" },
              { key: "fromEntityName", title: "Requested by" },
              { key: "dispatchFromWarehouseName", title: "Dispatch warehouse", render: (row) => row?.dispatchFromWarehouseName || row?.warehouseName || "-" },
              { key: "grandTotal", title: "Amount", render: (row) => money(row?.grandTotal || row?.subtotal) },
              { key: "pod", title: "POD", render: (row) => (row?.proofOfDeliveryUrl || row?.podUrl ? "Uploaded" : "Pending") },
            ]}
            emptyTitle="No supplier primary orders"
            emptyDescription="Company admin-assigned primary orders will appear here when ready for supplier action."
          />
        </SectionCard>
      );
    }

    if (activeModule.key === "settlements") {
      return (
        <div className="grid gap-5 xl:grid-cols-2">
          <SectionCard title="Supplier invoices" description="Invoices visible against this supplier workflow.">
            <DocumentTable
              rows={invoices}
              columns={[
                { key: "documentNo", title: "Invoice" },
                { key: "invoiceDate", title: "Invoice date", render: (row) => fmt(row?.invoiceDate) },
                { key: "invoiceTotal", title: "Invoice total", render: (row) => money(row?.invoiceTotal) },
                { key: "balanceAmount", title: "Balance", render: (row) => money(row?.balanceAmount) },
                { key: "paymentStatus", title: "Status", type: "status" },
              ]}
              emptyTitle="No supplier invoices found"
              emptyDescription="Supplier invoices posted in V2 finance will appear here."
            />
          </SectionCard>
          <SectionCard title="Supplier payments" description="Settlement records and posted payment activity.">
            <DocumentTable
              rows={payments}
              columns={[
                { key: "documentNo", title: "Payment" },
                { key: "paymentDate", title: "Payment date", render: (row) => fmt(row?.paymentDate) },
                { key: "amount", title: "Amount", render: (row) => money(row?.amount) },
                { key: "paymentMethod", title: "Method" },
                { key: "status", title: "Status", type: "status" },
              ]}
              emptyTitle="No supplier payments found"
              emptyDescription="Payments allocated against supplier invoices will appear here."
            />
          </SectionCard>
        </div>
      );
    }

    return (
      <div className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Assigned primary orders" value={metrics.assigned} helper="Supplier order queue" />
          <MetricCard label="POD pending" value={metrics.podPending} helper="Orders waiting for POD upload" />
          <MetricCard label="Open supplier invoices" value={metrics.openInvoices} helper="Unpaid or partially paid" />
          <MetricCard label="Settled amount" value={money(metrics.paidAmount)} helper="Approved/posted supplier payments" />
        </div>

        <SectionCard title="Workflow checkpoints" description="Use these shortcuts to move between supplier execution, communication, and account settings.">
          <div className="grid gap-4 md:grid-cols-3">
            <QuickLink href="/dashboards/supplier/primary-orders" title="Open assigned primary orders" description="See line items, invoice view, receipts, and upload POD." />
            <QuickLink href="/dashboards/supplier/messages" title="Open supplier messages" description="Review latest communication and pending notifications." />
            <QuickLink href="/dashboards/supplier/settings" title="Manage supplier settings" description="Open account settings and keep supplier profile information current." />
          </div>
        </SectionCard>

        <SectionCard title="Recent linked receipts" description="Receipts linked to related company-distributor invoice flow for visibility from the supplier side.">
          <DocumentTable
            rows={receipts.slice(0, 6)}
            columns={[
              { key: "documentNo", title: "Receipt" },
              { key: "amount", title: "Amount", render: (row) => money(row?.amount) },
              { key: "paymentMethod", title: "Method" },
              { key: "status", title: "Status", type: "status" },
              { key: "paymentDate", title: "Date", render: (row) => fmt(row?.paymentDate) },
            ]}
            emptyTitle="No linked receipts yet"
            emptyDescription="Linked receipts will appear here once procurement and finance flows are posted."
          />
        </SectionCard>
      </div>
    );
  }, [activeModule.key, error, invoices, loading, metrics, orders, payments, receipts]);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Company · Supplier"
        title="Supplier execution workspace"
        description="This workspace gives suppliers a cleaner V2 command center with primary-order execution, POD readiness, and supplier finance visibility."
      />
      <ModuleCardStrip items={MODULES} activeKey={activeModule.key} onSelect={setActiveModule} />
      {content}
    </div>
  );
}

function MetricCard({ label, value, helper }) {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="text-xs uppercase tracking-[0.16em] text-zinc-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-zinc-950">{value}</div>
      <div className="mt-2 text-sm text-zinc-600">{helper}</div>
    </div>
  );
}

function QuickLink({ href, title, description }) {
  return (
    <Link href={href} className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4 shadow-sm transition hover:bg-white">
      <div className="text-sm font-semibold text-zinc-900">{title}</div>
      <div className="mt-2 text-sm text-zinc-600">{description}</div>
    </Link>
  );
}
