"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PageHeader from "../../../components/foundation/PageHeader";
import SectionCard from "../../../components/foundation/SectionCard";
import EmptyState from "../../../components/foundation/EmptyState";
import DocumentTable from "../../../components/foundation/DocumentTable";
import ModuleCardStrip from "../../../components/foundation/ModuleCardStrip";
import StatusBadge from "../../../components/foundation/StatusBadge";
import { v2Api } from "../../../lib/api";

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function humanize(value = "") {
  return String(value || "module")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function summarizeCompanyAccess(rules = []) {
  const grouped = new Map();
  for (const rule of rules || []) {
    const moduleKey = String(rule?.moduleKey || "other");
    if (!grouped.has(moduleKey)) grouped.set(moduleKey, []);
    grouped.get(moduleKey).push(rule);
  }
  return Array.from(grouped.entries()).map(([moduleKey, items]) => {
    const enabledSections = items.filter((item) => Array.isArray(item.allowedRoles) && item.allowedRoles.length > 0).length;
    return {
      key: moduleKey,
      title: humanize(moduleKey),
      description:
        enabledSections > 0
          ? `${enabledSections} enabled section${enabledSections === 1 ? "" : "s"}`
          : "No enabled sections yet",
      enabled: enabledSections > 0,
    };
  });
}

function buildHealthTone(company = {}) {
  const score = [company.email, company.phone1, company.mainOfficeAddress].filter(Boolean).length;
  if (score === 3) return { value: "Complete", tone: "approved" };
  if (score === 2) return { value: "Needs Review", tone: "pending" };
  return { value: "Setup Required", tone: "unpaid" };
}

export default function SystemAdminWorkspace() {
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [moduleSummary, setModuleSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [moduleLoading, setModuleLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadCompanies() {
    setLoading(true);
    setError("");
    try {
      const data = await v2Api.systemAdmin.listCompanies();
      const rows = Array.isArray(data?.companies) ? data.companies : [];
      setCompanies(rows);
      setSelectedCompanyId((current) => current || rows[0]?._id || "");
    } catch (err) {
      setError(err.message || "Failed to load companies");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCompanies();
  }, []);

  const selectedCompany = useMemo(
    () => companies.find((item) => String(item._id) === String(selectedCompanyId)) || companies[0] || null,
    [companies, selectedCompanyId],
  );

  useEffect(() => {
    let active = true;
    async function loadModules() {
      if (!selectedCompany?.companyId) {
        setModuleSummary([]);
        return;
      }
      setModuleLoading(true);
      try {
        const data = await v2Api.systemAdmin.getModuleAccess(selectedCompany.companyId);
        if (!active) return;
        setModuleSummary(summarizeCompanyAccess(data?.rules || []));
      } catch {
        if (!active) return;
        setModuleSummary([]);
      } finally {
        if (active) setModuleLoading(false);
      }
    }
    loadModules();
    return () => {
      active = false;
    };
  }, [selectedCompany?.companyId]);

  const stats = useMemo(() => {
    const total = companies.length;
    const configuredContacts = companies.filter((item) => item.email && item.phone1).length;
    const withAddress = companies.filter((item) => item.mainOfficeAddress).length;
    const recentlyAdded = companies.filter((item) => {
      const created = item?.createdAt ? new Date(item.createdAt).getTime() : 0;
      return created && Date.now() - created < 1000 * 60 * 60 * 24 * 30;
    }).length;
    return [
      { label: "Companies", value: total, note: `${recentlyAdded} added in 30 days` },
      { label: "Ready profiles", value: configuredContacts, note: `${Math.max(total - configuredContacts, 0)} need contacts` },
      { label: "Address coverage", value: withAddress, note: `${Math.max(total - withAddress, 0)} need main office` },
      { label: "Module families", value: moduleSummary.length, note: moduleLoading ? "Loading..." : "Selected company access" },
    ];
  }, [companies, moduleSummary.length, moduleLoading]);

  const companyCards = useMemo(
    () =>
      companies.map((company) => {
        const health = buildHealthTone(company);
        return {
          key: company._id,
          title: company.name || company.companyId,
          description: `${company.companyId || "No ID"} • ${health.value}`,
        };
      }),
    [companies],
  );

  const companyColumns = [
    { key: "name", title: "Company" },
    { key: "companyId", title: "Company ID" },
    { key: "phone1", title: "Primary Phone" },
    { key: "email", title: "Email" },
    { key: "createdAt", title: "Created", render: (row) => formatDate(row.createdAt) },
    { key: "health", title: "Profile Health", render: (row) => { const health = buildHealthTone(row); return <StatusBadge value={health.value} tone={health.tone} />; } },
    {
      key: "actions",
      title: "Actions",
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedCompanyId(row._id)}
            className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700"
          >
            Focus company
          </button>
          <Link href={`/dashboards/admin/companies/${row._id}`} className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50">
            Open details
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="System Control Center"
        title="Platform dashboard and company management"
        description="Create companies, review tenant readiness, and manage module posture for every company through one shared V2 control surface."
        actions={
          <>
            <button
              type="button"
              onClick={loadCompanies}
              className="rounded-2xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Refresh data
            </button>
            <Link href="/dashboards/admin/companies/add" className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
              Add new company
            </Link>
          </>
        }
      />

      {error ? <div className="rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <div className="grid gap-4 lg:grid-cols-4">
        {stats.map((item) => (
          <SectionCard key={item.label} className="bg-gradient-to-br from-white to-zinc-50">
            <div className="text-sm font-medium text-zinc-500">{item.label}</div>
            <div className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">{item.value}</div>
            <div className="mt-2 text-xs text-zinc-500">{item.note}</div>
          </SectionCard>
        ))}
      </div>

      <SectionCard title="Company strip" description="Pick one company to inspect platform readiness and module access posture.">
        {companyCards.length ? (
          <ModuleCardStrip items={companyCards} activeKey={selectedCompany?._id || ""} onSelect={(item) => setSelectedCompanyId(item.key)} />
        ) : (
          <EmptyState title="No companies yet" description="Create a company to start the tenant setup flow." action={<Link href="/dashboards/admin/companies/add" className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Add new company</Link>} />
        )}
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <SectionCard title="Company register" description="System-admin view of registered companies and profile completeness.">
          {loading ? (
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-6 text-sm text-zinc-500">Loading companies...</div>
          ) : (
            <DocumentTable columns={companyColumns} rows={companies} emptyTitle="No companies available" emptyDescription="Create a company to start tenant setup, module access, and UI rollout." />
          )}
        </SectionCard>

        <SectionCard title={selectedCompany ? `${selectedCompany.name} overview` : "Selected company overview"} description="Readiness snapshot, access posture, and direct management links for the selected company.">
          {selectedCompany ? (
            <div className="space-y-5">
              <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold text-zinc-900">{selectedCompany.name}</div>
                    <div className="mt-1 text-sm text-zinc-500">Company ID: {selectedCompany.companyId || "-"}</div>
                    <div className="mt-1 text-sm text-zinc-500">Tenant slug: {selectedCompany.slug || "-"}</div>
                  </div>
                  <StatusBadge value={buildHealthTone(selectedCompany).value} tone={buildHealthTone(selectedCompany).tone} />
                </div>
                <div className="mt-4 grid gap-3 text-sm text-zinc-600">
                  <div><span className="font-medium text-zinc-900">Email:</span> {selectedCompany.email || "Not added"}</div>
                  <div><span className="font-medium text-zinc-900">Phone:</span> {selectedCompany.phone1 || "Not added"}</div>
                  <div><span className="font-medium text-zinc-900">Address:</span> {selectedCompany.mainOfficeAddress || "Not added"}</div>
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-zinc-900">Feature and module enable / disable</div>
                    <div className="text-xs text-zinc-500">Backed by company module access until dedicated feature flags are added.</div>
                  </div>
                  <Link href={`/dashboards/admin/companies/${selectedCompany._id}`} className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50">Manage details</Link>
                </div>
                {moduleLoading ? (
                  <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-5 text-sm text-zinc-500">Loading module summary...</div>
                ) : moduleSummary.length ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {moduleSummary.map((module) => (
                      <div key={module.key} className="rounded-2xl border border-zinc-200 bg-white p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-sm font-semibold text-zinc-900">{module.title}</div>
                            <div className="mt-1 text-xs text-zinc-500">{module.description}</div>
                          </div>
                          <StatusBadge value={module.enabled ? "Enabled" : "Locked"} tone={module.enabled ? "approved" : "draft"} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState title="No module summary yet" description="Open company details to configure module access and company feature posture." />
                )}
              </div>
            </div>
          ) : (
            <EmptyState title="Select a company" description="Choose a company from the strip or register to inspect readiness and platform controls." />
          )}
        </SectionCard>
      </div>
    </div>
  );
}
