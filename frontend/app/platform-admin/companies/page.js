"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/api";

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState([]);
  const [form, setForm] = useState({ name: "", slug: "", email: "", phone: "", primaryColor: "#10b981" });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  async function loadCompanies() {
    setLoading(true);
    try {
      const data = await apiFetch('/platform-admin/companies');
      setCompanies(data?.companies || []);
    } catch (error) {
      setMessage(error?.message || 'Failed to load companies');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadCompanies().catch(() => undefined); }, []);

  const previewSlug = useMemo(() => slugify(form.slug || form.name), [form.slug, form.name]);

  async function createCompany(e) {
    e.preventDefault();
    setSubmitting(true);
    setMessage("");
    try {
      const data = await apiFetch('/platform-admin/companies', { method: 'POST', body: form });
      setMessage(`Company created successfully with slug: ${data?.company?.slug || previewSlug}`);
      setForm({ name: "", slug: "", email: "", phone: "", primaryColor: "#10b981" });
      await loadCompanies();
    } catch (error) {
      setMessage(error?.message || 'Failed to create company');
    } finally { setSubmitting(false); }
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-emerald-700 font-semibold">Platform Management</div>
          <h1 className="mt-2 text-2xl font-bold text-zinc-900">Platform Company Manager</h1>
          <p className="mt-2 text-zinc-600">Create companies, open workspace pages, and launch onboarding from one place.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <form onSubmit={createCompany} className="rounded-2xl border bg-white p-5 shadow-sm space-y-4">
            <div>
              <div className="text-lg font-semibold text-zinc-900">Add Company</div>
              <div className="mt-1 text-sm text-zinc-600">Slug can be blank. The backend will generate a unique one automatically.</div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">Company Name</label>
              <input className="w-full rounded-xl border px-3 py-2" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value, slug: prev.slug ? prev.slug : slugify(e.target.value) }))} required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">Slug</label>
              <input className="w-full rounded-xl border px-3 py-2" value={form.slug} onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))} placeholder="optional-company-slug" />
              <div className="mt-1 text-xs text-zinc-500">Preview: {previewSlug || 'company'}</div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">Email</label>
                <input className="w-full rounded-xl border px-3 py-2" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-zinc-700">Phone</label>
                <input className="w-full rounded-xl border px-3 py-2" value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">Primary Color</label>
              <input type="color" className="h-10 w-24 rounded-lg border" value={form.primaryColor} onChange={(e) => setForm((prev) => ({ ...prev, primaryColor: e.target.value }))} />
            </div>
            <button type="submit" disabled={submitting} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{submitting ? 'Creating...' : 'Create Company'}</button>
            {message ? <div className="text-sm text-zinc-700">{message}</div> : null}
          </form>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-lg font-semibold text-zinc-900">Companies</div>
                <div className="mt-1 text-sm text-zinc-600">Open company workspace, onboarding, runtime preview, and audit tools.</div>
              </div>
            </div>
            <div className="mt-4 overflow-hidden rounded-2xl border">
              <table className="min-w-full divide-y divide-zinc-200 text-sm">
                <thead className="bg-zinc-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-zinc-700">Company</th>
                    <th className="px-4 py-3 text-left font-semibold text-zinc-700">Slug</th>
                    <th className="px-4 py-3 text-left font-semibold text-zinc-700">Lifecycle</th>
                    <th className="px-4 py-3 text-left font-semibold text-zinc-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 bg-white">
                  {loading ? (
                    <tr><td className="px-4 py-4 text-zinc-500" colSpan={4}>Loading companies...</td></tr>
                  ) : companies.length === 0 ? (
                    <tr><td className="px-4 py-4 text-zinc-500" colSpan={4}>No companies created yet.</td></tr>
                  ) : companies.map((company) => (
                    <tr key={company._id}>
                      <td className="px-4 py-4">
                        <div className="font-medium text-zinc-900">{company.name}</div>
                        <div className="text-xs text-zinc-500">{company.email || company.phone || 'No contact info'}</div>
                      </td>
                      <td className="px-4 py-4 text-zinc-700">{company.slug}</td>
                      <td className="px-4 py-4"><span className="rounded-full bg-zinc-100 px-2 py-1 text-xs text-zinc-700">{company.lifecycleStatus || company.status || 'active'}</span></td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <Link className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-zinc-50" href={`/platform-admin/companies/${company._id}`}>Workspace</Link>
                          <Link className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-zinc-50" href={`/platform-admin/companies/${company._id}/onboarding`}>Onboarding</Link>
                          <Link className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-zinc-50" href={`/dashboards/superadmin/runtime-preview?companyId=${company._id}`}>Preview</Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
