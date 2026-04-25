"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminShell from "../components/AdminShell";
import PageHeader from "../../../components/foundation/PageHeader";
import SectionCard from "../../../components/foundation/SectionCard";
import DocumentTable from "../../../components/foundation/DocumentTable";
import EmptyState from "../../../components/foundation/EmptyState";
import StatusBadge from "../../../components/foundation/StatusBadge";
import { v2Api } from "../../../lib/api";

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function companyHealth(company = {}) {
  const score = [company.email, company.phone1, company.mainOfficeAddress].filter(Boolean).length;
  if (score === 3) return { value: "Complete", tone: "approved" };
  if (score === 2) return { value: "Needs Review", tone: "pending" };
  return { value: "Setup Required", tone: "unpaid" };
}

export default function CompanyListPage() {
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [deletingId, setDeletingId] = useState("");

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const data = await v2Api.systemAdmin.listCompanies();
      setRows(Array.isArray(data?.companies) ? data.companies : []);
    } catch (e) {
      setErr(e.message || "Failed to load companies");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onDelete(id) {
    if (!window.confirm("Delete this company? This cannot be undone.")) return;
    setErr("");
    setDeletingId(id);
    try {
      await v2Api.systemAdmin.deleteCompany(id);
      await load();
    } catch (e) {
      setErr(e.message || "Failed to delete company");
    } finally {
      setDeletingId("");
    }
  }

  const filteredRows = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return rows;
    return rows.filter((row) =>
      [row.name, row.companyId, row.email, row.phone1, row.slug]
        .join(" ")
        .toLowerCase()
        .includes(value),
    );
  }, [query, rows]);

  const metrics = useMemo(() => {
    const total = rows.length;
    const ready = rows.filter((row) => companyHealth(row).value === "Complete").length;
    const needsReview = rows.filter((row) => companyHealth(row).value === "Needs Review").length;
    const setupRequired = rows.filter((row) => companyHealth(row).value === "Setup Required").length;
    return [
      { label: "Total companies", value: total },
      { label: "Ready profiles", value: ready },
      { label: "Needs review", value: needsReview },
      { label: "Setup required", value: setupRequired },
    ];
  }, [rows]);

  const columns = [
    { key: "name", title: "Company" },
    { key: "companyId", title: "Company ID" },
    { key: "slug", title: "Tenant Slug" },
    { key: "phone1", title: "Primary Phone" },
    { key: "email", title: "Email" },
    { key: "createdAt", title: "Created", render: (row) => formatDate(row.createdAt) },
    {
      key: "health",
      title: "Profile Health",
      render: (row) => {
        const health = companyHealth(row);
        return <StatusBadge value={health.value} tone={health.tone} />;
      },
    },
    {
      key: "actions",
      title: "Actions",
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <Link href={`/portals/admin/companies/${row._id}`} className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50">
            Open details
          </Link>
          <button
            type="button"
            disabled={deletingId === row._id}
            onClick={() => onDelete(row._id)}
            className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-60"
          >
            {deletingId === row._id ? "Deleting..." : "Delete"}
          </button>
        </div>
      ),
    },
  ];

  return (
    <AdminShell title="Company List" user={null}>
      <div className="space-y-6">
        <PageHeader
          eyebrow="System Admin"
          title="Company register"
          description="Review every tenant, inspect setup quality, and jump into company detail controls from one platform register."
          actions={
            <>
              <button type="button" onClick={load} className="rounded-2xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
                Refresh list
              </button>
              <Link href="/portals/admin/companies/add" className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                Add new company
              </Link>
            </>
          }
        />

        {err ? <div className="rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div> : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <SectionCard key={metric.label} className="bg-gradient-to-br from-white to-zinc-50">
              <div className="text-sm font-medium text-zinc-500">{metric.label}</div>
              <div className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">{metric.value}</div>
            </SectionCard>
          ))}
        </div>

        <SectionCard title="Filter companies" description="Search by name, company ID, email, phone, or tenant slug.">
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search companies..."
            className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none ring-0 focus:border-emerald-300"
          />
        </SectionCard>

        <SectionCard title="Company list" description="System-admin controlled tenants and their profile readiness.">
          {loading ? (
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-6 text-sm text-zinc-500">Loading companies...</div>
          ) : filteredRows.length ? (
            <DocumentTable columns={columns} rows={filteredRows} emptyTitle="No companies found" emptyDescription="Try a different search or create a new company." />
          ) : (
            <EmptyState title="No companies found" description="Try a different search or create a new company." action={<Link href="/portals/admin/companies/add" className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Add new company</Link>} />
          )}
        </SectionCard>
      </div>
    </AdminShell>
  );
}
