"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fetchSystemAdminOverview,
  saveSubscriptionPlan,
  seedSystemAdminDefaults,
  updateCompanyControl,
} from "../../../services/systemAdminService";

const DEFAULT_PLAN_FORM = {
  key: "growth",
  name: "Growth",
  monthlyPrice: 0,
  userLimit: 50,
  branchLimit: 5,
  warehouseLimit: 5,
  moduleLimit: 20,
  mobileUserLimit: 20,
  allowedModules: "dashboard,companies,users,roles,products,procurement,inventory,warehouse,primary-sales-orders,finance,reports",
  status: "active",
};

function StatCard({ label, value, helper }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">{label}</p>
      <p className="mt-3 text-4xl font-black text-slate-950">{value ?? 0}</p>
      {helper ? <p className="mt-2 text-sm text-slate-500">{helper}</p> : null}
    </div>
  );
}

function Badge({ children, tone = "slate" }) {
  const tones = {
    green: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-700",
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-blue-50 text-blue-700",
    slate: "bg-slate-100 text-slate-600",
  };
  return <span className={`rounded-full px-3 py-1 text-xs font-bold ${tones[tone] || tones.slate}`}>{children}</span>;
}

function CompanyControlRow({ company, plans, onSaved }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [planKey, setPlanKey] = useState(company.planKey || "starter");
  const [status, setStatus] = useState(company.status || "active");

  async function save() {
    setBusy(true);
    setError("");
    try {
      await updateCompanyControl(company.companyId, {
        status,
        subscription: {
          planKey,
          status: status === "suspended" ? "suspended" : "active",
        },
      });
      onSaved?.();
    } catch (err) {
      setError(err.message || "Failed to save company control");
    } finally {
      setBusy(false);
    }
  }

  const userPercent = company.userLimit ? Math.min(100, Math.round((company.userCount / company.userLimit) * 100)) : 0;
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-black text-slate-950">{company.name || company.companyId}</h3>
            <Badge tone={company.status === "active" ? "green" : company.status === "suspended" ? "red" : "amber"}>{company.status || "active"}</Badge>
            <Badge tone="blue">{company.erpTemplateKey || "distribution_erp"}</Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">Company ID: {company.companyId}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-xs font-bold uppercase text-slate-400">Users</p>
              <p className="text-lg font-black text-slate-950">{company.userCount}/{company.userLimit || "∞"}</p>
              <div className="mt-2 h-2 rounded-full bg-slate-200"><div className="h-2 rounded-full bg-emerald-500" style={{ width: `${userPercent}%` }} /></div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-xs font-bold uppercase text-slate-400">Modules</p>
              <p className="text-lg font-black text-slate-950">{company.moduleCount}/{company.moduleLimit || "∞"}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-xs font-bold uppercase text-slate-400">Mobile Users</p>
              <p className="text-lg font-black text-slate-950">Limit {company.mobileUserLimit || 0}</p>
            </div>
          </div>
        </div>
        <div className="grid min-w-[320px] gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <select value={planKey} onChange={(e) => setPlanKey(e.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-emerald-500">
            {plans.map((plan) => <option key={plan.key} value={plan.key}>{plan.name}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-emerald-500">
            <option value="trial">Trial</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
            <option value="expired">Expired</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button onClick={save} disabled={busy} className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-sm disabled:opacity-50">{busy ? "Saving…" : "Save Control"}</button>
          {error ? <p className="rounded-2xl bg-red-50 p-3 text-sm text-red-600">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}

export default function SystemAdminPortalPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [planForm, setPlanForm] = useState(DEFAULT_PLAN_FORM);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const result = await fetchSystemAdminOverview();
      setData(result);
    } catch (err) {
      setError(err.message || "Failed to load SaaS control center");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const stats = data?.stats || {};
  const plans = data?.plans?.length ? data.plans : [{ key: "starter", name: "Starter" }, { key: "professional", name: "Professional" }, { key: "enterprise", name: "Enterprise" }];
  const companies = data?.companies || [];
  const sortedCompanies = useMemo(() => companies.slice().sort((a, b) => String(a.name).localeCompare(String(b.name))), [companies]);

  async function seed() {
    setMessage("");
    setError("");
    try {
      const result = await seedSystemAdminDefaults();
      setMessage(result.message || "Defaults seeded");
      await load();
    } catch (err) {
      setError(err.message || "Failed to seed defaults");
    }
  }

  async function savePlan() {
    setMessage("");
    setError("");
    try {
      const payload = {
        ...planForm,
        monthlyPrice: Number(planForm.monthlyPrice || 0),
        userLimit: Number(planForm.userLimit || 0),
        branchLimit: Number(planForm.branchLimit || 0),
        warehouseLimit: Number(planForm.warehouseLimit || 0),
        moduleLimit: Number(planForm.moduleLimit || 0),
        mobileUserLimit: Number(planForm.mobileUserLimit || 0),
        allowedModules: String(planForm.allowedModules || "").split(",").map((item) => item.trim()).filter(Boolean),
      };
      await saveSubscriptionPlan(payload);
      setMessage("Subscription plan saved");
      await load();
    } catch (err) {
      setError(err.message || "Failed to save subscription plan");
    }
  }

  return <div className="space-y-6">
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.35em] text-emerald-600">Phase 12 SaaS Control Center</p>
          <h2 className="mt-2 text-3xl font-black text-slate-950">Rawyan ERP System Admin</h2>
          <p className="mt-2 max-w-4xl text-sm text-slate-600">Control companies, ERP templates, subscription limits, module access, activation/suspension, and SaaS onboarding from one portal.</p>
        </div>
        <button onClick={seed} className="rounded-2xl bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-600 px-5 py-3 text-sm font-black text-white shadow-sm">Seed SaaS Defaults</button>
      </div>
      {message ? <p className="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{message}</p> : null}
      {error ? <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-600">{error}</p> : null}
    </div>

    {loading ? <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">Loading SaaS control center…</div> : null}

    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Companies" value={stats.companies} helper={`${stats.activeCompanies || 0} active, ${stats.suspendedCompanies || 0} suspended`} />
      <StatCard label="Users" value={stats.users} helper={`${stats.mobileUsers || 0} mobile-enabled users`} />
      <StatCard label="Modules" value={stats.activeModules} helper={`${stats.mobileModules || 0} mobile modules`} />
      <StatCard label="Plans" value={stats.plans} helper={`${stats.templates || 0} ERP templates`} />
    </div>

    <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
      <div className="space-y-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Company Control</p>
          <h3 className="mt-2 text-2xl font-black text-slate-950">Client Companies</h3>
          <p className="mt-1 text-sm text-slate-500">Change plan, status, and subscription access. This is where your SaaS admin manages client companies.</p>
        </div>
        {sortedCompanies.length ? sortedCompanies.map((company) => <CompanyControlRow key={company.companyId} company={company} plans={plans} onSaved={load} />) : <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">No companies found yet.</div>}
      </div>

      <div className="space-y-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Subscription Plans</p>
          <h3 className="mt-2 text-2xl font-black text-slate-950">Create / Update Plan</h3>
          <div className="mt-4 grid gap-3">
            {[
              ["key", "Plan key"], ["name", "Plan name"], ["monthlyPrice", "Monthly price"], ["userLimit", "User limit"], ["branchLimit", "Branch limit"], ["warehouseLimit", "Warehouse limit"], ["moduleLimit", "Module limit"], ["mobileUserLimit", "Mobile user limit"], ["allowedModules", "Allowed modules comma-separated or *"],
            ].map(([key, label]) => <label key={key} className="block"><span className="text-xs font-bold uppercase text-slate-500">{label}</span><input value={planForm[key] ?? ""} onChange={(e) => setPlanForm((prev) => ({ ...prev, [key]: e.target.value }))} className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500" /></label>)}
            <select value={planForm.status} onChange={(e) => setPlanForm((prev) => ({ ...prev, status: e.target.value }))} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-emerald-500">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <button onClick={savePlan} className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white">Save Plan</button>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Existing Plans</p>
          <div className="mt-3 space-y-3">
            {plans.map((plan) => <div key={plan.key} className="rounded-2xl bg-slate-50 p-4"><div className="flex items-center justify-between gap-3"><p className="font-black text-slate-950">{plan.name}</p><Badge tone={plan.status === "active" ? "green" : "slate"}>{plan.status || "active"}</Badge></div><p className="mt-1 text-xs text-slate-500">Users {plan.userLimit || 0} · Modules {plan.moduleLimit || 0} · Mobile {plan.mobileUserLimit || 0}</p></div>)}
          </div>
        </div>
      </div>
    </div>
  </div>;
}
