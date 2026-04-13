"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { v2Api } from "../../../lib/api";
import DocumentTable from "../../../components/foundation/DocumentTable";
import EmptyState from "../../../components/foundation/EmptyState";
import PageHeader from "../../../components/foundation/PageHeader";
import SectionCard from "../../../components/foundation/SectionCard";

function money(value) {
  return `PKR ${Number(value || 0).toLocaleString()}`;
}

function fmt(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
}

export default function SupplierProfileWorkspace({ supplierId = "" }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [supplier, setSupplier] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [supplierData, invoiceData, paymentData, orderData] = await Promise.all([
          v2Api.procurement.supplierById(supplierId),
          v2Api.procurement.supplierInvoices(),
          v2Api.procurement.supplierPayments(),
          v2Api.procurement.supplierPrimaryOrders(),
        ]);
        if (!active) return;
        const currentSupplier = supplierData?.user || null;
        const supplierName = String(currentSupplier?.fullName || currentSupplier?.username || "").trim().toLowerCase();
        const supplierKey = String(currentSupplier?._id || currentSupplier?.id || supplierId || "");

        setSupplier(currentSupplier);
        setInvoices(
          (invoiceData?.invoices || []).filter((row) => {
            const rowId = String(row?.supplier?.partyId || "");
            const rowName = String(row?.supplier?.partyName || "").trim().toLowerCase();
            return (supplierKey && rowId === supplierKey) || (supplierName && rowName === supplierName);
          }),
        );
        setPayments(
          (paymentData?.payments || []).filter((row) => {
            const rowId = String(row?.supplier?.partyId || "");
            const rowName = String(row?.supplier?.partyName || "").trim().toLowerCase();
            return (supplierKey && rowId === supplierKey) || (supplierName && rowName === supplierName);
          }),
        );
        setOrders(
          (orderData?.transactions || []).filter((row) => {
            const rowId = String(row?.supplierId || row?.supplier?._id || "");
            const rowName = String(row?.supplierName || "").trim().toLowerCase();
            return (supplierKey && rowId === supplierKey) || (supplierName && rowName === supplierName);
          }),
        );
      } catch (err) {
        if (!active) return;
        setError(err.message || "Failed to load supplier profile");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [supplierId]);

  const stats = useMemo(() => ({
    invoices: invoices.length,
    payments: payments.length,
    assignedOrders: orders.length,
    openValue: invoices.reduce((sum, row) => sum + Number(row?.balanceAmount || 0), 0),
  }), [invoices, orders.length, payments.length]);

  if (loading) {
    return <EmptyState title="Loading supplier profile" description="Fetching supplier procurement, invoice, and settlement details." />;
  }

  if (error) {
    return <EmptyState title="Supplier profile failed to load" description={error} />;
  }

  if (!supplier) {
    return <EmptyState title="Supplier not found" description="The supplier could not be loaded from the current company workspace." />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Procurement · Supplier Profile"
        title={supplier?.fullName || supplier?.username || "Supplier profile"}
        description="Profile procurement relationships, warehouse linkage, assigned supplier orders, and the current finance position for this supplier."
        actions={(
          <>
            <Link href="/dashboards/admin/procurement/suppliers" className="rounded-2xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">Back to suppliers</Link>
            <Link href="/dashboards/admin/procurement/payments" className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">Open supplier finance</Link>
          </>
        )}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Assigned primary orders" value={stats.assignedOrders} helper="Supplier workflow queue" />
        <MetricCard label="Supplier invoices" value={stats.invoices} helper="V2 supplier invoices" />
        <MetricCard label="Supplier payments" value={stats.payments} helper="Settlements recorded" />
        <MetricCard label="Open value" value={money(stats.openValue)} helper="Current unpaid exposure" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard title="Supplier profile" description="Core contact and warehouse linkage information synced from user management.">
          <div className="grid gap-3 text-sm md:grid-cols-2">
            <Info label="Supplier name" value={supplier?.fullName || supplier?.username || "-"} />
            <Info label="Status" value={supplier?.status || "-"} />
            <Info label="Mobile" value={supplier?.mobile || supplier?.mobileNumber || "-"} />
            <Info label="Email" value={supplier?.email || "-"} />
            <Info label="Primary warehouse" value={supplier?.supplierWarehouseName1 || "-"} />
            <Info label="Backup warehouse" value={supplier?.supplierWarehouseName2 || "-"} />
          </div>
        </SectionCard>

        <SectionCard title="Assigned primary orders" description="Supplier-facing primary orders currently visible in the supplier workflow.">
          <DocumentTable
            rows={orders}
            columns={[
              { key: "transactionCode", title: "Order ref" },
              { key: "requestStatus", title: "Status", type: "status" },
              { key: "dispatchFromWarehouseName", title: "Dispatch warehouse", render: (row) => row?.dispatchFromWarehouseName || row?.warehouseName || "-" },
              { key: "grandTotal", title: "Grand total", render: (row) => money(row?.grandTotal || row?.subtotal) },
              { key: "createdAt", title: "Created", render: (row) => fmt(row?.transactionAt || row?.createdAt) },
            ]}
            emptyTitle="No assigned supplier orders"
            emptyDescription="Once company admin assigns primary orders to this supplier, they appear here."
          />
        </SectionCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <SectionCard title="Supplier invoices" description="Invoices issued against procurement activity for this supplier.">
          <DocumentTable
            rows={invoices}
            columns={[
              { key: "documentNo", title: "Invoice" },
              { key: "invoiceDate", title: "Invoice date", render: (row) => fmt(row?.invoiceDate) },
              { key: "invoiceTotal", title: "Invoice total", render: (row) => money(row?.invoiceTotal) },
              { key: "balanceAmount", title: "Balance", render: (row) => money(row?.balanceAmount) },
              { key: "paymentStatus", title: "Payment", type: "status" },
            ]}
            emptyTitle="No supplier invoices"
            emptyDescription="Supplier invoices will appear here once posted by finance or procurement."
          />
        </SectionCard>

        <SectionCard title="Supplier payments" description="Payments allocated or posted against this supplier.">
          <DocumentTable
            rows={payments}
            columns={[
              { key: "documentNo", title: "Payment" },
              { key: "paymentDate", title: "Payment date", render: (row) => fmt(row?.paymentDate) },
              { key: "amount", title: "Amount", render: (row) => money(row?.amount) },
              { key: "paymentMethod", title: "Method" },
              { key: "status", title: "Status", type: "status" },
            ]}
            emptyTitle="No supplier payments"
            emptyDescription="Posted supplier payments will be visible here."
          />
        </SectionCard>
      </div>
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

function Info({ label, value }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
      <div className="text-xs uppercase tracking-[0.14em] text-zinc-500">{label}</div>
      <div className="mt-2 text-sm font-medium text-zinc-900">{value || "-"}</div>
    </div>
  );
}
