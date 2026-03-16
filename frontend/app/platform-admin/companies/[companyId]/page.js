"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "../../../lib/api";

const DEFAULT_SETTINGS = { appName: "", logoUrl: "", primaryColor: "#10b981", invoiceHeader: "", invoiceFooter: "", receiptHeader: "", receiptFooter: "" };

export default function CompanyWorkspacePage() {
  const { companyId } = useParams();
  const [company, setCompany] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const [companyRes, settingsRes, plansRes, subRes] = await Promise.all([
        apiFetch(`/platform-admin/companies/${companyId}`),
        apiFetch(`/platform-admin/companies/${companyId}/settings`),
        apiFetch('/platform-admin/plans').catch(() => ({ plans: [] })),
        apiFetch(`/platform-admin/companies/${companyId}/subscription`).catch(() => ({ subscription: null })),
      ]);
      setCompany(companyRes.company || null);
      setSettings({ ...DEFAULT_SETTINGS, ...(settingsRes.settings || companyRes.company?.settings || {}) });
      setPlans(plansRes.plans || []);
      setSubscription(subRes.subscription || null);
    } catch (e) {
      setError(e.message || 'Failed to load company workspace');
    } finally { setLoading(false); }
  }

  useEffect(() => { if (companyId) load(); }, [companyId]);

  async function saveSettings(e) {
    e.preventDefault();
    setSaving(true); setMessage(""); setError("");
    try {
      await apiFetch(`/platform-admin/companies/${companyId}/settings`, { method: 'PUT', body: settings });
      setMessage('Company settings saved.');
      await load();
    } catch (e2) { setError(e2.message || 'Failed to save settings'); } finally { setSaving(false); }
  }

  async function assignPlan(planId) {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);
    await apiFetch(`/platform-admin/companies/${companyId}/subscription`, { method: 'POST', body: { planId, billingCycle: 'monthly', startDate, endDate, status: 'active', paymentStatus: 'paid' } });
    await load();
  }

  async function lifecycle(action) {
    await apiFetch(`/platform-admin/companies/${companyId}/${action}`, { method: 'POST', body: {} });
    await load();
  }

  const summary = useMemo(() => ({
    roleCount: company?.roleCount || 0,
    moduleCount: company?.settings?.modules ? Object.keys(company.settings.modules).length : 0,
    hierarchy: company?.hierarchy?.hierarchyName || company?.hierarchy?.hierarchyCode || 'Not assigned',
  }), [company]);

  if (loading) return <div className="p-6 text-sm text-zinc-500">Loading company workspace...</div>;
  if (!company) return <div className="p-6 text-sm text-red-600">Company not found.</div>;

  return (
    <div className="min-h-screen bg-zinc-50 p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="rounded-2xl border bg-white p-6">
          <div className="text-xs uppercase tracking-wide text-emerald-700 font-semibold">Platform Management</div>
          <h1 className="text-3xl font-bold text-zinc-900 mt-2">{company.name}</h1>
          <p className="text-zinc-600 mt-2">Manage company details, onboarding, roles, modules, plans, and lifecycle state.</p>
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <span className="rounded-full border px-3 py-1">Slug: {company.slug}</span>
            <span className="rounded-full border px-3 py-1 capitalize">Lifecycle: {company.lifecycleStatus || 'inactive'}</span>
            <span className="rounded-full border px-3 py-1">Onboarding: {company.onboardingStatus || 'not_started'}</span>
            <span className="rounded-full border px-3 py-1">Hierarchy: {summary.hierarchy}</span>
            <span className="rounded-full border px-3 py-1">Roles: {summary.roleCount}</span>
          </div>
        </div>

        {message ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}
        {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 rounded-2xl border bg-white p-6">
            <div className="font-semibold text-zinc-900 text-lg">Company Detail Editor</div>
            <form className="mt-4 space-y-4" onSubmit={saveSettings}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-sm mb-1">App Name</label><input className="w-full rounded-xl border px-3 py-2" value={settings.appName || ''} onChange={(e)=>setSettings((p)=>({...p, appName:e.target.value}))} /></div>
                <div><label className="block text-sm mb-1">Logo URL</label><input className="w-full rounded-xl border px-3 py-2" value={settings.logoUrl || ''} onChange={(e)=>setSettings((p)=>({...p, logoUrl:e.target.value}))} /></div>
                <div><label className="block text-sm mb-1">Primary Color</label><input className="w-full rounded-xl border px-3 py-2" value={settings.primaryColor || '#10b981'} onChange={(e)=>setSettings((p)=>({...p, primaryColor:e.target.value}))} /></div>
                <div><label className="block text-sm mb-1">Invoice Header</label><input className="w-full rounded-xl border px-3 py-2" value={settings.invoiceHeader || ''} onChange={(e)=>setSettings((p)=>({...p, invoiceHeader:e.target.value}))} /></div>
                <div><label className="block text-sm mb-1">Invoice Footer</label><input className="w-full rounded-xl border px-3 py-2" value={settings.invoiceFooter || ''} onChange={(e)=>setSettings((p)=>({...p, invoiceFooter:e.target.value}))} /></div>
                <div><label className="block text-sm mb-1">Receipt Header</label><input className="w-full rounded-xl border px-3 py-2" value={settings.receiptHeader || ''} onChange={(e)=>setSettings((p)=>({...p, receiptHeader:e.target.value}))} /></div>
                <div className="md:col-span-2"><label className="block text-sm mb-1">Receipt Footer</label><input className="w-full rounded-xl border px-3 py-2" value={settings.receiptFooter || ''} onChange={(e)=>setSettings((p)=>({...p, receiptFooter:e.target.value}))} /></div>
              </div>
              <div className="flex gap-3"><button disabled={saving} className="rounded-xl bg-emerald-600 px-4 py-2 text-white font-semibold">{saving ? 'Saving...' : 'Save Company Details'}</button><Link href={`/platform-admin/companies/${companyId}/onboarding`} className="rounded-xl border px-4 py-2 font-semibold">Open Onboarding</Link></div>
            </form>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border bg-white p-6">
              <div className="font-semibold text-zinc-900">Lifecycle Actions</div>
              <div className="mt-4 grid gap-2">
                <button onClick={()=>lifecycle('activate')} className="rounded-xl bg-emerald-600 px-4 py-2 text-white font-semibold">Activate</button>
                <button onClick={()=>lifecycle('suspend')} className="rounded-xl border px-4 py-2 font-semibold">Suspend</button>
                <button onClick={()=>lifecycle('reactivate')} className="rounded-xl border px-4 py-2 font-semibold">Reactivate</button>
                <button onClick={()=>lifecycle('mark-expired')} className="rounded-xl border px-4 py-2 font-semibold">Mark Expired</button>
              </div>
            </div>
            <div className="rounded-2xl border bg-white p-6">
              <div className="font-semibold text-zinc-900">Plan Assignment</div>
              <div className="text-sm text-zinc-600 mt-1">Current plan: {subscription?.planId?.name || 'None assigned'}</div>
              <div className="mt-4 grid gap-2">
                {plans.length ? plans.map((plan)=><button key={plan._id} onClick={()=>assignPlan(plan._id)} className="rounded-xl border px-4 py-2 text-left"><div className="font-semibold">{plan.name}</div><div className="text-xs text-zinc-500">{plan.code} · {plan.billingType}</div></button>) : <div className="text-sm text-zinc-500">No plans available yet.</div>}
              </div>
            </div>
            <div className="rounded-2xl border bg-white p-6">
              <div className="font-semibold text-zinc-900">Quick Links</div>
              <div className="mt-4 grid gap-2">
                <Link href={`/dashboards/superadmin/runtime-preview?companyId=${companyId}`} className="rounded-xl border px-4 py-2 font-semibold">Runtime Preview</Link>
                <Link href={`/platform-admin/companies/${companyId}/config-snapshots`} className="rounded-xl border px-4 py-2 font-semibold">Config Snapshots</Link>
                <Link href={`/platform-admin/companies/${companyId}/audit-logs`} className="rounded-xl border px-4 py-2 font-semibold">Audit Logs</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
