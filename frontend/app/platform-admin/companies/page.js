"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/api";

const EMPTY_FORM = {
  name: "",
  slug: "",
  status: "active",
  appName: "",
  logoUrl: "",
  primaryColor: "#10b981",
  address: "",
  phone: "",
  email: "",
};

function LifecycleBadge({ value }) {
  const v = String(value || "inactive").toLowerCase();
  const map = {
    active: "bg-emerald-100 text-emerald-700 border-emerald-200",
    trial: "bg-blue-100 text-blue-700 border-blue-200",
    suspended: "bg-amber-100 text-amber-700 border-amber-200",
    expired: "bg-red-100 text-red-700 border-red-200",
    inactive: "bg-zinc-100 text-zinc-600 border-zinc-200",
  };
  return <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${map[v] || map.inactive}`}>{v}</span>;
}

export default function PlatformCompaniesPage() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  async function loadCompanies() {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch("/platform-admin/companies");
      setCompanies(data?.companies || []);
    } catch (err) {
      setError(err.message || "Failed to load companies");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCompanies().catch(() => undefined);
  }, []);

  const canSubmit = useMemo(() => form.name.trim().length > 0, [form.name]);

  async function createCompany(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError("");
    try {
      await apiFetch("/platform-admin/companies", { method: "POST", body: form });
      setForm(EMPTY_FORM);
      setShowCreate(false);
      await loadCompanies();
    } catch (err) {
      setError(err.message || "Failed to create company");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="rounded-2xl border bg-white p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide text-emerald-700 font-semibold">Platform Management</div>
              <h1 className="text-2xl md:text-3xl font-bold text-zinc-900 mt-2">Companies</h1>
              <p className="text-zinc-600 mt-2 max-w-3xl">Manage companies, open onboarding flows, inspect lifecycle state, and launch company-level configuration.</p>
            </div>
            <button onClick={() => setShowCreate((v) => !v)} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
              {showCreate ? "Close" : "Add Company"}
            </button>
          </div>
          {error ? <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
          {showCreate ? (
            <form onSubmit={createCompany} className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
              {Object.entries({
                name: "Company Name",
                slug: "Slug (optional)",
                appName: "App Name",
                logoUrl: "Logo URL",
                primaryColor: "Primary Color",
                address: "Address",
                phone: "Phone",
                email: "Email",
              }).map(([key, label]) => (
                <label key={key} className="text-sm">
                  <div className="mb-1 font-medium text-zinc-700">{label}</div>
                  <input value={form[key]} onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))} className="w-full rounded-xl border px-3 py-2" />
                </label>
              ))}
              <label className="text-sm">
                <div className="mb-1 font-medium text-zinc-700">Status</div>
                <select value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))} className="w-full rounded-xl border px-3 py-2">
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                  <option value="trial">trial</option>
                  <option value="suspended">suspended</option>
                </select>
              </label>
              <div className="md:col-span-2 flex justify-end">
                <button disabled={!canSubmit || saving} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                  {saving ? "Creating..." : "Create Company"}
                </button>
              </div>
            </form>
          ) : null}
        </div>

        {loading ? <div className="rounded-2xl border bg-white p-6 text-sm">Loading companies...</div> : null}

        <div className="space-y-4">
          {companies.map((company) => (
            <div key={company._id} className="rounded-2xl border bg-white p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <Link href={`/platform-admin/companies/${company._id}`} className="text-2xl font-semibold text-zinc-900 hover:text-emerald-700">{company.name}</Link>
                  <div className="mt-2 text-sm text-zinc-500">{company.slug || "-"}</div>
                  <div className="mt-4"><LifecycleBadge value={company.lifecycleStatus || company.status} /></div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link href={`/platform-admin/companies/${company._id}`} className="rounded-xl border px-4 py-2 text-sm font-medium hover:border-emerald-300">Open Company</Link>
                  <Link href={`/platform-admin/companies/${company._id}/onboarding`} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Open Onboarding</Link>
                  <Link href={`/platform-admin/companies/${company._id}/config-snapshots`} className="rounded-xl border px-4 py-2 text-sm font-medium hover:border-emerald-300">Config Snapshots</Link>
                  <Link href={`/platform-admin/companies/${company._id}/audit-logs`} className="rounded-xl border px-4 py-2 text-sm font-medium hover:border-emerald-300">Audit Logs</Link>
                </div>
              </div>
            </div>
          ))}
          {!loading && companies.length === 0 ? <div className="rounded-2xl border bg-white p-6 text-sm text-zinc-600">No companies yet. Create the first company to start onboarding.</div> : null}
        </div>
      </div>
    </div>
  );
}
