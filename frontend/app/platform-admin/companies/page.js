"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/api";

const EMPTY_FORM = {
  name: "",
  slug: "",
  appName: "",
  logoUrl: "",
  primaryColor: "#10b981",
  address: "",
  phone: "",
  email: "",
  status: "active",
};

function slugify(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function PlatformCompaniesPage() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  async function loadCompanies() {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch('/platform-admin/companies');
      setCompanies(data.companies || []);
    } catch (e) {
      setError(e.message || 'Failed to load companies');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadCompanies(); }, []);

  const sortedCompanies = useMemo(() => [...companies].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))), [companies]);

  function updateField(key, value) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'name' && !prev.slug) next.slug = slugify(value);
      return next;
    });
  }

  async function createCompany(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await apiFetch('/platform-admin/companies', { method: 'POST', body: form });
      setForm(EMPTY_FORM);
      setShowCreate(false);
      await loadCompanies();
    } catch (e2) {
      setError(e2.message || 'Failed to create company');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="rounded-2xl border bg-white p-6">
          <div className="text-xs uppercase tracking-wide text-emerald-700 font-semibold">Platform Management</div>
          <h1 className="text-2xl font-bold text-zinc-900 mt-2">Companies</h1>
          <p className="text-zinc-600 mt-2">Manage companies, open onboarding flows, inspect lifecycle state, and launch company-level configuration.</p>
          <div className="mt-4 flex gap-3">
            <button onClick={() => setShowCreate((v) => !v)} className="rounded-xl bg-emerald-600 px-4 py-2 text-white font-semibold">{showCreate ? 'Close' : 'Add Company'}</button>
          </div>
        </div>

        {showCreate ? (
          <form onSubmit={createCompany} className="rounded-2xl border bg-white p-6 space-y-4">
            {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-zinc-700 mb-1">Company Name</label>
                <input className="w-full rounded-xl border px-3 py-2" value={form.name} onChange={(e) => updateField('name', e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm text-zinc-700 mb-1">Slug (optional, auto-unique)</label>
                <input className="w-full rounded-xl border px-3 py-2" value={form.slug} onChange={(e) => updateField('slug', slugify(e.target.value))} />
                <div className="text-xs text-zinc-500 mt-1">Used as a URL-safe key. If taken, the backend will create a unique slug automatically.</div>
              </div>
              <div>
                <label className="block text-sm text-zinc-700 mb-1">App Name</label>
                <input className="w-full rounded-xl border px-3 py-2" value={form.appName} onChange={(e) => updateField('appName', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm text-zinc-700 mb-1">Logo URL</label>
                <input className="w-full rounded-xl border px-3 py-2" value={form.logoUrl} onChange={(e) => updateField('logoUrl', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm text-zinc-700 mb-1">Primary Color</label>
                <input className="w-full rounded-xl border px-3 py-2" value={form.primaryColor} onChange={(e) => updateField('primaryColor', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm text-zinc-700 mb-1">Address</label>
                <input className="w-full rounded-xl border px-3 py-2" value={form.address} onChange={(e) => updateField('address', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm text-zinc-700 mb-1">Phone</label>
                <input className="w-full rounded-xl border px-3 py-2" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm text-zinc-700 mb-1">Email</label>
                <input className="w-full rounded-xl border px-3 py-2" value={form.email} onChange={(e) => updateField('email', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm text-zinc-700 mb-1">Status</label>
                <select className="w-full rounded-xl border px-3 py-2" value={form.status} onChange={(e) => updateField('status', e.target.value)}>
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                  <option value="suspended">suspended</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end">
              <button disabled={saving} className="rounded-xl bg-emerald-600 px-5 py-2 text-white font-semibold disabled:opacity-60">{saving ? 'Creating...' : 'Create Company'}</button>
            </div>
          </form>
        ) : null}

        {loading ? <div className="text-sm text-zinc-500">Loading companies...</div> : null}
        {!loading && sortedCompanies.length === 0 ? <div className="rounded-2xl border bg-white p-6 text-sm text-zinc-600">No companies yet. Create the first company to begin onboarding.</div> : null}

        <div className="space-y-4">
          {sortedCompanies.map((company) => (
            <div key={company._id} className="rounded-2xl border bg-white p-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="text-2xl font-semibold text-zinc-900">{company.name}</div>
                <div className="text-sm text-zinc-500 mt-1">{company.slug || '-'} · {company.settings?.appName || '-'} </div>
                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                  <span className="rounded-full border px-3 py-1 capitalize">{company.lifecycleStatus || 'inactive'}</span>
                  <span className="rounded-full border px-3 py-1">Onboarding: {company.onboardingStatus || 'not_started'}</span>
                  <span className="rounded-full border px-3 py-1">Roles: {company.roleCount || 0}</span>
                  <span className="rounded-full border px-3 py-1">Documents: {company.documentTemplateCount || 0}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-3 md:justify-end">
                <Link href={`/platform-admin/companies/${company._id}`} className="rounded-xl bg-zinc-900 px-4 py-2 text-white font-semibold">Workspace</Link>
                <Link href={`/platform-admin/companies/${company._id}/onboarding`} className="rounded-xl bg-emerald-600 px-4 py-2 text-white font-semibold">Open Onboarding</Link>
                <Link href={`/platform-admin/companies/${company._id}/config-snapshots`} className="rounded-xl border px-4 py-2 font-semibold">Config Snapshots</Link>
                <Link href={`/platform-admin/companies/${company._id}/audit-logs`} className="rounded-xl border px-4 py-2 font-semibold">Audit Logs</Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
