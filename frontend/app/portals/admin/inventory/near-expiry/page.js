"use client";

import { useEffect, useMemo, useState } from "react";
import AdminShell from "../../components/AdminShell";
import PageHeader from "../../../../components/foundation/PageHeader";
import SectionCard from "../../../../components/foundation/SectionCard";
import DocumentTable from "../../../../components/foundation/DocumentTable";
import EmptyState from "../../../../components/foundation/EmptyState";
import { v2Api } from "../../../../lib/api";

function safeNumber(value) {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
}

export default function AdminNearExpiryPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);

  async function loadData() {
    setLoading(true);
    setError("");
    try {
      const res = await v2Api.warehouseManager.nearExpiry();
      const products = Array.isArray(res?.rows) ? res.rows : Array.isArray(res?.products) ? res.products : [];
      setRows(products);
    } catch (err) {
      setError(err.message || "Failed to load near-expiry products.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const stats = useMemo(() => {
    const totalQty = rows.reduce((sum, row) => sum + safeNumber(row?.quantity || row?.qty || row?.stock), 0);
    return [
      { label: "Near-expiry products", value: rows.length.toLocaleString(), note: "Items flagged by the inventory monitoring API" },
      { label: "At-risk quantity", value: totalQty.toLocaleString(), note: "Total quantity currently exposed to expiry risk" },
    ];
  }, [rows]);

  return (
    <AdminShell title="Near Expiry Products" user={null}>
      <div className="space-y-6">
        <PageHeader
          eyebrow="Inventory monitoring"
          title="Near expiry products"
          description="Review products approaching expiry and use this page as the clean inventory-risk destination for the shared admin sidebar."
          actions={
            <button type="button" onClick={loadData} className="rounded-2xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
              Refresh list
            </button>
          }
        />

        {error ? <div className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">{error}</div> : null}

        <div className="grid gap-4 md:grid-cols-2">
          {stats.map((item) => (
            <SectionCard key={item.label} className="bg-gradient-to-br from-white to-zinc-50">
              <div className="text-sm font-medium text-zinc-500">{item.label}</div>
              <div className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">{item.value}</div>
              <div className="mt-2 text-xs text-zinc-500">{item.note}</div>
            </SectionCard>
          ))}
        </div>

        <SectionCard title="Near-expiry inventory" description="Products and batches currently returned by the expiry monitoring endpoint.">
          {loading ? (
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-6 text-sm text-zinc-500">Loading near-expiry products…</div>
          ) : rows.length ? (
            <DocumentTable
              columns={[
                { key: "productName", title: "Product", render: (row) => row?.productName || row?.name || row?.product || "Product" },
                { key: "batchNo", title: "Batch", render: (row) => row?.batchNo || row?.batch || "-" },
                { key: "warehouseName", title: "Warehouse", render: (row) => row?.warehouseName || row?.warehouse || "-" },
                { key: "quantity", title: "Qty", render: (row) => safeNumber(row?.quantity || row?.qty || row?.stock).toLocaleString() },
                { key: "expiryDate", title: "Expiry", render: (row) => formatDate(row?.expiryDate || row?.expiry) },
              ]}
              rows={rows}
              emptyTitle="No near-expiry products"
              emptyDescription="No items are currently being flagged by the inventory expiry monitor."
            />
          ) : (
            <EmptyState title="No near-expiry products" description="No items are currently being flagged by the inventory expiry monitor." />
          )}
        </SectionCard>
      </div>
    </AdminShell>
  );
}
