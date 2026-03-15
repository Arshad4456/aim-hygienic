"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import DynamicDashboardShell from "../../../dashboards/components/DynamicDashboardShell";
import DynamicDashboardHome from "../../../dashboards/components/DynamicDashboardHome";
import { apiFetch } from "../../../lib/api";

function RuntimePreviewContent() {
  const searchParams = useSearchParams();
  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState(searchParams.get("companyId") || "");
  const [roles, setRoles] = useState([]);
  const [roleCode, setRoleCode] = useState("");
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch("/platform-admin/companies")
      .then((data) => {
        const list = data?.companies || [];
        setCompanies(list);
        if (!companyId && list[0]?._id) setCompanyId(String(list[0]._id));
      })
      .catch((err) => setError(err.message || "Failed to load companies"));
  }, []);

  useEffect(() => {
    if (!companyId) return;
    setDashboard(null);
    apiFetch(`/platform-admin/companies/${companyId}/roles`)
      .then((data) => {
        const list = data?.roles || [];
        setRoles(list);
        setRoleCode(list[0]?.roleCode || "");
      })
      .catch((err) => setError(err.message || "Failed to load company roles"));
  }, [companyId]);

  async function loadPreview() {
    if (!companyId || !roleCode) return;
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch(`/platform-admin/companies/${companyId}/runtime-preview/${roleCode}`);
      setDashboard(data?.dashboard || null);
    } catch (err) {
      setError(err.message || "Failed to load runtime preview");
    } finally {
      setLoading(false);
    }
  }

  const canPreview = useMemo(() => Boolean(companyId && roleCode), [companyId, roleCode]);

  return (
    <div className="min-h-screen bg-zinc-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="rounded-2xl border bg-white p-5">
          <div className="text-lg font-semibold">Runtime Preview</div>
          <div className="text-sm text-zinc-600 mt-1">Preview any configured company dashboard as a selected role without logging in as that user.</div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4">
            <select className="rounded-xl border px-3 py-2" value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
              <option value="">Select Company</option>
              {companies.map((company) => <option key={company._id} value={company._id}>{company.name}</option>)}
            </select>
            <select className="rounded-xl border px-3 py-2" value={roleCode} onChange={(e) => setRoleCode(e.target.value)} disabled={!roles.length}>
              <option value="">{roles.length ? "Select Role" : "No roles configured yet"}</option>
              {roles.map((role) => <option key={role._id || role.roleCode} value={role.roleCode}>{role.roleName || role.roleCode}</option>)}
            </select>
            <button className="rounded-xl bg-emerald-600 text-white px-4 py-2 disabled:opacity-50" disabled={!canPreview || loading} onClick={loadPreview}>
              {loading ? "Loading..." : "Preview Dashboard"}
            </button>
            {companyId ? <Link href={`/platform-admin/companies/${companyId}/onboarding`} className="rounded-xl border px-4 py-2 text-sm font-medium text-center">Open Company Setup</Link> : <div />}
          </div>
          {!roles.length && companyId ? <div className="mt-3 text-sm text-amber-700">This company does not have role dashboards yet. Complete onboarding first, then return here for preview.</div> : null}
          {error ? <div className="mt-3 text-sm text-red-600">{error}</div> : null}
        </div>

        {dashboard ? (
          <DynamicDashboardShell dashboard={dashboard}>
            <DynamicDashboardHome dashboard={dashboard} />
          </DynamicDashboardShell>
        ) : null}
      </div>
    </div>
  );
}

export default function SuperAdminRuntimePreviewPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-50 p-4 md:p-6" />}>
      <RuntimePreviewContent />
    </Suspense>
  );
}