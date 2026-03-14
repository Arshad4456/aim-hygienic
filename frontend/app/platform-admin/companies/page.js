"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

function statusBadge(status) {
  const normalized = String(status || "inactive").toLowerCase();
  const map = {
    active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    trial: "bg-amber-50 text-amber-700 border-amber-200",
    suspended: "bg-orange-50 text-orange-700 border-orange-200",
    expired: "bg-rose-50 text-rose-700 border-rose-200",
    inactive: "bg-zinc-50 text-zinc-700 border-zinc-200",
  };
  return map[normalized] || map.inactive;
}

export default function PlatformCompaniesPage() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    apiFetch("/platform-admin/companies")
      .then((data) => {
        if (!mounted) return;
        setCompanies(data.companies || []);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e.message || "Failed to load companies");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="rounded-2xl border bg-white p-6">
          <div className="text-xs uppercase tracking-wide text-emerald-700 font-semibold">Platform Management</div>
          <h1 className="text-2xl font-bold text-zinc-900 mt-2">Companies</h1>
          <p className="text-zinc-600 mt-2">Manage companies, open onboarding flows, inspect lifecycle state, and launch company-level configuration.</p>
        </div>

        {loading ? <div className="text-sm text-zinc-600">Loading companies...</div> : null}
        {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

        <div className="grid gap-4">
          {companies.map((company) => (
            <div key={company._id} className="rounded-2xl border bg-white p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="text-xl font-semibold text-zinc-900">{company.name}</div>
                  <div className="mt-1 text-sm text-zinc-500">{company.slug || "-"}</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs ${statusBadge(company.lifecycleStatus || company.status)}`}>{company.lifecycleStatus || company.status || "inactive"}</span>
                    {company.activeHierarchyCode ? <span className="inline-flex rounded-full border px-2.5 py-1 text-xs bg-emerald-50 text-emerald-700 border-emerald-200">Hierarchy: {company.activeHierarchyCode}</span> : null}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 md:justify-end">
                  <Link href={`/platform-admin/companies/${company._id}/onboarding`} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Open Onboarding</Link>
                  <Link href={`/platform-admin/companies/${company._id}/config-snapshots`} className="rounded-lg border px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-emerald-300">Config Snapshots</Link>
                  <Link href={`/platform-admin/companies/${company._id}/audit-logs`} className="rounded-lg border px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-emerald-300">Audit Logs</Link>
                </div>
              </div>
            </div>
          ))}
          {!loading && !error && companies.length === 0 ? (
            <div className="rounded-2xl border bg-white p-6 text-sm text-zinc-500">No companies found yet.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
