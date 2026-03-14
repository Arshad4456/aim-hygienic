"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "../../../lib/api";

function Card({ title, children, actions }) {
  return (
    <div className="rounded-2xl border bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-lg font-semibold text-zinc-900">{title}</div>
        </div>
        {actions}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

export default function CompanyWorkspacePage() {
  const { companyId } = useParams();
  const [data, setData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!companyId) return;
    Promise.all([
      apiFetch(`/platform-admin/companies/${companyId}`),
      apiFetch(`/platform-admin/companies/${companyId}/onboarding-summary`).catch(() => null),
      apiFetch(`/platform-admin/companies/${companyId}/subscription`).catch(() => null),
    ])
      .then(([companyRes, onboardingRes, subscriptionRes]) => {
        setData(companyRes?.company || null);
        setSummary(onboardingRes || null);
        setSubscription(subscriptionRes?.subscription || null);
      })
      .catch((err) => setError(err.message || "Failed to load company workspace"));
  }, [companyId]);

  if (!data) {
    return <div className="p-6 text-sm">{error || "Loading company workspace..."}</div>;
  }

  const roles = summary?.roles || [];
  const dashboards = summary?.dashboards || [];
  const modules = summary?.modules || [];
  const permissions = summary?.permissions || [];
  const documents = summary?.documents || [];

  return (
    <div className="min-h-screen bg-zinc-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="rounded-2xl border bg-white p-6">
          <div className="text-xs uppercase tracking-wide text-emerald-700 font-semibold">Platform Management</div>
          <h1 className="text-2xl md:text-3xl font-bold mt-2">{data.name}</h1>
          <p className="text-zinc-600 mt-2">Manage company lifecycle, onboarding, roles, modules, documents, and runtime previews from one workspace.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href={`/platform-admin/companies/${companyId}/onboarding`} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Open Onboarding</Link>
            <Link href={`/dashboards/superadmin/runtime-preview?companyId=${companyId}`} className="rounded-xl border px-4 py-2 text-sm font-medium">Runtime Preview</Link>
            <Link href={`/platform-admin/companies/${companyId}/config-snapshots`} className="rounded-xl border px-4 py-2 text-sm font-medium">Config Snapshots</Link>
            <Link href={`/platform-admin/companies/${companyId}/audit-logs`} className="rounded-xl border px-4 py-2 text-sm font-medium">Audit Logs</Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card title="Lifecycle & Subscription">
            <div className="space-y-2 text-sm text-zinc-700">
              <div><span className="font-medium">Status:</span> {data.lifecycleStatus || data.status || "inactive"}</div>
              <div><span className="font-medium">Slug:</span> {data.slug || "-"}</div>
              <div><span className="font-medium">Plan:</span> {subscription?.planId?.name || subscription?.planName || "-"}</div>
              <div><span className="font-medium">Subscription:</span> {subscription?.status || "-"}</div>
            </div>
          </Card>
          <Card title="Onboarding Progress">
            <div className="space-y-2 text-sm text-zinc-700">
              <div><span className="font-medium">Current step:</span> {summary?.onboardingState?.currentStep || 1}</div>
              <div><span className="font-medium">Completed:</span> {summary?.onboardingSummary?.completedCount || 0}</div>
              <div><span className="font-medium">Pending:</span> {(summary?.onboardingSummary?.pendingSteps || []).join(", ") || "none"}</div>
            </div>
          </Card>
          <Card title="Runtime Summary">
            <div className="space-y-2 text-sm text-zinc-700">
              <div><span className="font-medium">Roles:</span> {roles.length}</div>
              <div><span className="font-medium">Dashboards:</span> {dashboards.length}</div>
              <div><span className="font-medium">Modules:</span> {modules.length}</div>
              <div><span className="font-medium">Permissions:</span> {permissions.length}</div>
              <div><span className="font-medium">Documents:</span> {documents.length}</div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Card title="Assigned Roles">
            <div className="flex flex-wrap gap-2">{roles.length ? roles.map((role) => <span key={role._id} className="rounded-full border px-3 py-1 text-sm">{role.roleName}</span>) : <div className="text-sm text-zinc-500">No roles assigned yet.</div>}</div>
          </Card>
          <Card title="Document Templates">
            <div className="space-y-2 text-sm">{documents.length ? documents.map((doc) => <div key={doc._id} className="rounded-lg border px-3 py-2">{doc.documentType} • {doc.templateName} {doc.isDefault ? <span className="text-emerald-700">(default)</span> : null}</div>) : <div className="text-zinc-500">No document templates applied yet.</div>}</div>
          </Card>
        </div>
      </div>
    </div>
  );
}
