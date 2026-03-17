"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "../../../lib/api";
import RoleModuleMatrix from "../../components/RoleModuleMatrix";
import ApplySetupTemplatePanel from "../../components/ApplySetupTemplatePanel";

const TABS = [
  ["overview", "Overview"],
  ["matrix", "Role / Module Matrix"],
  ["templates", "Templates"],
  ["subscription", "Plan & Lifecycle"],
];

export default function CompanyWorkspacePage() {
  const { companyId } = useParams();
  const [activeTab, setActiveTab] = useState("overview");
  const [workspace, setWorkspace] = useState(null);
  const [matrixData, setMatrixData] = useState({ templates: [], matrix: [] });
  const [templates, setTemplates] = useState([]);
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [companyForm, setCompanyForm] = useState({ name: "", slug: "", email: "", phone: "", primaryColor: "#10b981" });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadAll() {
    setLoading(true);
    setMessage("");
    try {
      const [workspaceRes, matrixRes, templatesRes, plansRes] = await Promise.all([
        apiFetch(`/platform-admin/companies/${companyId}/workspace-summary`),
        apiFetch(`/platform-admin/companies/${companyId}/role-module-matrix`).catch(() => ({ templates: [], matrix: [] })),
        apiFetch("/platform-admin/setup-templates").catch(() => ({ templates: [] })),
        apiFetch("/platform-admin/plans").catch(() => ({ plans: [] })),
      ]);
      setWorkspace(workspaceRes);
      setMatrixData({ templates: matrixRes.templates || [], matrix: matrixRes.matrix || [] });
      setTemplates(templatesRes.templates || []);
      setPlans(plansRes.plans || []);
      setSelectedPlanId(workspaceRes.subscription?.planId || workspaceRes.subscription?.plan?._id || "");
      setCompanyForm({
        name: workspaceRes.company?.name || "",
        slug: workspaceRes.company?.slug || "",
        email: workspaceRes.company?.email || "",
        phone: workspaceRes.company?.phone || "",
        primaryColor: workspaceRes.company?.primaryColor || "#10b981",
      });
    } catch (error) {
      setMessage(error?.message || "Failed to load company workspace");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (companyId) loadAll().catch(() => undefined);
  }, [companyId]);

  const company = workspace?.company;
  const overviewCards = useMemo(
    () => [
      ["Roles", workspace?.roles?.length || 0],
      ["Dashboards", workspace?.dashboards?.length || 0],
      ["Modules", workspace?.modules?.length || 0],
      ["Documents", workspace?.documents?.length || 0],
    ],
    [workspace]
  );

  async function saveCompanyDetails() {
    try {
      await apiFetch(`/platform-admin/companies/${companyId}`, { method: "PUT", body: companyForm });
      setMessage("Company details updated successfully.");
      await loadAll();
    } catch (error) {
      setMessage(error?.message || "Failed to update company details");
    }
  }

  async function assignPlan() {
    if (!selectedPlanId) return;
    try {
      await apiFetch(`/platform-admin/companies/${companyId}/subscription`, {
        method: "POST",
        body: {
          planId: selectedPlanId,
          billingCycle: "monthly",
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: "active",
          paymentStatus: "paid",
        },
      });
      setMessage("Plan assigned successfully.");
      await loadAll();
    } catch (error) {
      setMessage(error?.message || "Failed to assign plan");
    }
  }

  async function lifecycleAction(action) {
    try {
      await apiFetch(`/platform-admin/companies/${companyId}/${action}`, { method: "POST", body: {} });
      setMessage(`Company ${action.replace("-", " ")} successful.`);
      await loadAll();
    } catch (error) {
      setMessage(error?.message || "Failed lifecycle action");
    }
  }

  if (loading) return <div className="p-6 text-sm">Loading company workspace...</div>;
  if (!company) return <div className="p-6 text-sm text-red-600">{message || "Company not found."}</div>;

  return (
    <div className="min-h-screen bg-zinc-50 p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide text-emerald-700 font-semibold">Company Workspace</div>
              <h1 className="mt-2 text-2xl font-bold text-zinc-900">{company.name}</h1>
              <div className="mt-2 flex flex-wrap gap-2 text-sm text-zinc-600">
                <span>Slug: {company.slug}</span>
                <span>•</span>
                <span>Lifecycle: {company.lifecycleStatus || company.status}</span>
                <span>•</span>
                <span>Onboarding: {workspace?.onboardingState?.steps?.setupCompleted ? "completed" : company.onboardingStatus || "not_started"}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={`/platform-admin/companies/${companyId}/onboarding`} className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-zinc-50">Open Onboarding</Link>
              <Link href={`/dashboards/superadmin/runtime-preview?companyId=${companyId}`} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white">Runtime Preview</Link>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {TABS.map(([key, label]) => (
            <button key={key} onClick={() => setActiveTab(key)} className={`rounded-xl px-4 py-2 text-sm font-medium ${activeTab === key ? "bg-emerald-600 text-white" : "border bg-white text-zinc-700"}`}>
              {label}
            </button>
          ))}
        </div>

        {message ? <div className="rounded-xl border bg-white p-4 text-sm text-zinc-700">{message}</div> : null}

        {activeTab === "overview" ? (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              {overviewCards.map(([label, value]) => (
                <div key={label} className="rounded-2xl border bg-white p-5 shadow-sm">
                  <div className="text-sm text-zinc-500">{label}</div>
                  <div className="mt-2 text-2xl font-bold text-zinc-900">{value}</div>
                </div>
              ))}
            </div>
            <div className="grid gap-6 xl:grid-cols-2">
              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <div className="text-lg font-semibold text-zinc-900">Company Detail Editor</div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <input className="rounded-xl border px-3 py-2" value={companyForm.name} onChange={(e) => setCompanyForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Company name" />
                  <input className="rounded-xl border px-3 py-2" value={companyForm.slug} onChange={(e) => setCompanyForm((prev) => ({ ...prev, slug: e.target.value }))} placeholder="Slug" />
                  <input className="rounded-xl border px-3 py-2" value={companyForm.email} onChange={(e) => setCompanyForm((prev) => ({ ...prev, email: e.target.value }))} placeholder="Email" />
                  <input className="rounded-xl border px-3 py-2" value={companyForm.phone} onChange={(e) => setCompanyForm((prev) => ({ ...prev, phone: e.target.value }))} placeholder="Phone" />
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <input type="color" className="h-10 w-20 rounded-lg border" value={companyForm.primaryColor} onChange={(e) => setCompanyForm((prev) => ({ ...prev, primaryColor: e.target.value }))} />
                  <button onClick={saveCompanyDetails} className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-zinc-50">Save Details</button>
                </div>
                <div className="mt-4 space-y-2 text-sm text-zinc-700">
                  <div>Hierarchy: {workspace?.hierarchyConfig?.hierarchyName || "Not configured"}</div>
                  <div>Roles: {(workspace?.roles || []).map((role) => role.roleName).join(", ") || "None"}</div>
                  <div>Current Plan: {workspace?.subscription?.planCode || "No plan assigned"}</div>
                </div>
              </div>
              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <div className="text-lg font-semibold text-zinc-900">Lifecycle Actions</div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button onClick={() => lifecycleAction("activate")} className="rounded-xl border px-4 py-2 text-sm">Activate</button>
                  <button onClick={() => lifecycleAction("suspend")} className="rounded-xl border px-4 py-2 text-sm">Suspend</button>
                  <button onClick={() => lifecycleAction("mark-expired")} className="rounded-xl border px-4 py-2 text-sm">Mark Expired</button>
                  <button onClick={() => lifecycleAction("reactivate")} className="rounded-xl border px-4 py-2 text-sm">Reactivate</button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === "matrix" ? (
          <RoleModuleMatrix companyId={companyId} matrix={matrixData.matrix || []} templates={matrixData.templates || []} onChanged={loadAll} />
        ) : null}

        {activeTab === "templates" ? (
          <ApplySetupTemplatePanel companyId={companyId} templates={templates} onApplied={loadAll} />
        ) : null}

        {activeTab === "subscription" ? (
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="text-lg font-semibold text-zinc-900">Plan & Subscription</div>
            <div className="mt-1 text-sm text-zinc-600">Assign a plan and manage company access lifecycle.</div>
            <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
              <select value={selectedPlanId} onChange={(e) => setSelectedPlanId(e.target.value)} className="flex-1 rounded-xl border px-3 py-2">
                <option value="">Select plan</option>
                {plans.map((plan) => (
                  <option key={plan._id} value={plan._id}>{plan.name} ({plan.code})</option>
                ))}
              </select>
              <button onClick={assignPlan} disabled={!selectedPlanId} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Assign Plan</button>
            </div>
            {workspace?.subscription ? (
              <div className="mt-4 rounded-xl border p-4 text-sm text-zinc-700">
                <div>Plan: {workspace.subscription.planCode || workspace.subscription.planId}</div>
                <div>Status: {workspace.subscription.status}</div>
                <div>Payment: {workspace.subscription.paymentStatus}</div>
              </div>
            ) : (
              <div className="mt-4 text-sm text-zinc-500">No current subscription assigned.</div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
