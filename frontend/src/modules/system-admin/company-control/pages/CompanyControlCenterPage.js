"use client";
import { useEffect, useMemo, useState } from "react";
import { fetchCompanyControlCenter } from "@/src/services/companyControlService";
import { usePortalPreferences } from "@/src/context/PortalPreferences";

function n(value) { return Number(value || 0).toLocaleString(); }
function dateText(value) { if (!value) return "-"; const d = new Date(value); return Number.isNaN(d.getTime()) ? "-" : d.toLocaleDateString(); }
function statusClass(status = "active") {
  const s = String(status || "active").toLowerCase();
  if (["active", "trial"].includes(s)) return "bg-emerald-50 text-emerald-700 border-emerald-100";
  if (["expired", "suspended", "inactive", "deactive"].includes(s)) return "bg-red-50 text-red-700 border-red-100";
  return "bg-amber-50 text-amber-700 border-amber-100";
}

function UsageMeter({ label, used = 0, limit = 0, percent = 0, help = "" }) {
  const over = limit && Number(used) >= Number(limit);
  return <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div><p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{label}</p><p className="mt-2 text-2xl font-black text-slate-950">{n(used)} / {limit ? n(limit) : "∞"}</p></div>
      <span className={`rounded-full px-3 py-1 text-xs font-black ${over ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{limit ? `${percent || 0}%` : "open"}</span>
    </div>
    <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${over ? "bg-red-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(100, Number(percent || 0))}%` }} /></div>
    {help ? <p className="mt-3 text-xs font-bold text-slate-500">{help}</p> : null}
  </div>;
}

function Section({ title, subtitle, children }) {
  return <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
    <div className="mb-4"><h3 className="text-lg font-black text-slate-950">{title}</h3>{subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}</div>
    {children}
  </section>;
}

export default function CompanyControlCenterPage() {
  const { t } = usePortalPreferences();
  const [state, setState] = useState({ loading: true, error: "", data: null });
  useEffect(() => {
    let active = true;
    fetchCompanyControlCenter()
      .then((data) => active && setState({ loading: false, error: "", data }))
      .catch((error) => active && setState({ loading: false, error: error.message || "Unable to load company control center", data: null }));
    return () => { active = false; };
  }, []);

  const data = state.data || {};
  const company = data.company || {};
  const subscription = data.subscription || {};
  const usage = data.usage || {};
  const limits = data.limits || {};
  const percent = data.percent || {};
  const activeModules = useMemo(() => (data.visibleModules || []).filter((m) => m.visibleToCurrentUser !== false), [data.visibleModules]);

  if (state.loading) return <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">{t("Loading company control center…")}</div>;
  if (state.error) return <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm font-bold text-red-700">{state.error}</div>;

  return <div className="space-y-6">
    <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
      <div className="bg-gradient-to-r from-slate-950 via-emerald-800 to-cyan-700 p-6 text-white">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-emerald-100">{t("Company Control Center")}</p>
        <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div><h1 className="text-3xl font-black">{company.name || company.companyId || "Company"}</h1><p className="mt-2 text-sm text-white/75">{company.erpTemplateKey || data.erpTemplateKey} · {company.email || "No email"} · {company.phone1 || "No phone"}</p></div>
          <div className="flex flex-wrap gap-2"><span className={`rounded-full border px-4 py-2 text-xs font-black ${statusClass(company.status)}`}>Company: {company.status || "active"}</span><span className={`rounded-full border px-4 py-2 text-xs font-black ${statusClass(subscription.status)}`}>Plan: {subscription.status || "active"}</span></div>
        </div>
      </div>
      <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4">
        <div><p className="text-xs font-black uppercase tracking-wide text-slate-400">Plan</p><p className="mt-1 font-black text-slate-950">{subscription.planName || subscription.planKey || "Starter"}</p></div>
        <div><p className="text-xs font-black uppercase tracking-wide text-slate-400">Expiry</p><p className="mt-1 font-black text-slate-950">{dateText(subscription.expiresAt)}</p></div>
        <div><p className="text-xs font-black uppercase tracking-wide text-slate-400">ERP Type</p><p className="mt-1 font-black text-slate-950">{data.erpTemplateKey || company.erpTemplateKey || "distribution_erp"}</p></div>
        <div><p className="text-xs font-black uppercase tracking-wide text-slate-400">Modules</p><p className="mt-1 font-black text-slate-950">{n(usage.modules)} active / {limits.modules ? n(limits.modules) : "∞"}</p></div>
      </div>
    </section>

    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      <UsageMeter label="Users" used={usage.users} limit={limits.users} percent={percent.users} help="All company users inside your tenant." />
      <UsageMeter label="Branches" used={usage.branches} limit={limits.branches} percent={percent.branches} help="Branch records allowed by your plan." />
      <UsageMeter label="Warehouses" used={usage.warehouses} limit={limits.warehouses} percent={percent.warehouses} help="Stock locations allowed by your plan." />
      <UsageMeter label="Mobile Users" used={usage.mobileUsers} limit={limits.mobileUsers} percent={percent.mobileUsers} help="Users with mobile app access." />
      <UsageMeter label="Modules" used={usage.modules} limit={limits.modules} percent={percent.modules} help="Enabled modules from your subscription." />
    </div>

    <div className="grid gap-6 xl:grid-cols-2">
      <Section title="Enabled Modules" subtitle="Only modules included in your active plan and ERP type are available to your company users.">
        <div className="grid gap-3 sm:grid-cols-2">
          {activeModules.map((module) => <a key={module.key} href={module.path || `/portals/${module.key}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-emerald-200 hover:bg-emerald-50"><p className="font-black text-slate-950">{module.name || module.key}</p><p className="mt-1 text-xs text-slate-500">{module.category || "Module"} · {module.key}</p></a>)}
          {!activeModules.length ? <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">No modules enabled yet. Ask System Admin to activate modules in your plan.</p> : null}
        </div>
      </Section>
      <Section title="Plan Rules" subtitle="These limits are enforced from backend, not just hidden from sidebar.">
        <div className="space-y-3 text-sm text-slate-600">
          <p className="rounded-2xl bg-slate-50 p-4"><b>User creation:</b> blocked when active users reach plan limit.</p>
          <p className="rounded-2xl bg-slate-50 p-4"><b>Mobile access:</b> blocked when mobile-user limit is reached.</p>
          <p className="rounded-2xl bg-slate-50 p-4"><b>Warehouses/branches:</b> creation is blocked when plan limit is reached.</p>
          <p className="rounded-2xl bg-slate-50 p-4"><b>Modules:</b> APIs are blocked when module is outside ERP type or active plan.</p>
        </div>
      </Section>
    </div>

    <div className="grid gap-6 xl:grid-cols-3">
      <Section title="Recent Users"><div className="space-y-2">{(data.usersPreview || []).map((u) => <div key={u._id || u.userId} className="rounded-2xl bg-slate-50 p-3 text-sm"><p className="font-black text-slate-950">{u.fullName || u.username}</p><p className="text-xs text-slate-500">{u.role || "User"} · {u.status || "active"}</p></div>)}{!(data.usersPreview || []).length ? <p className="text-sm text-slate-400">No users yet.</p> : null}</div></Section>
      <Section title="Branches"><div className="space-y-2">{(data.branchesPreview || []).map((b) => <div key={b._id || b.branchCode} className="rounded-2xl bg-slate-50 p-3 text-sm"><p className="font-black text-slate-950">{b.name || b.branchCode}</p><p className="text-xs text-slate-500">{b.city || b.address || "Branch"}</p></div>)}{!(data.branchesPreview || []).length ? <p className="text-sm text-slate-400">No branches yet.</p> : null}</div></Section>
      <Section title="Warehouses"><div className="space-y-2">{(data.warehousesPreview || []).map((w) => <div key={w._id || w.warehouseId} className="rounded-2xl bg-slate-50 p-3 text-sm"><p className="font-black text-slate-950">{w.name || w.warehouseId}</p><p className="text-xs text-slate-500">{w.city || w.address || "Warehouse"}</p></div>)}{!(data.warehousesPreview || []).length ? <p className="text-sm text-slate-400">No warehouses yet.</p> : null}</div></Section>
    </div>
  </div>;
}
