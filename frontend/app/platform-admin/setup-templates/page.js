"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

export default function SetupTemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [message, setMessage] = useState("");

  async function loadData() {
    const [templateRes, companyRes] = await Promise.all([
      apiFetch('/platform-admin/setup-templates'),
      apiFetch('/platform-admin/companies'),
    ]);
    setTemplates(templateRes.templates || []);
    setCompanies(companyRes.companies || []);
    setSelectedCompanyId((companyRes.companies || [])[0]?._id || "");
  }

  useEffect(() => { loadData().catch((error) => setMessage(error?.message || 'Failed to load setup templates')); }, []);

  async function applyTemplate(templateId) {
    if (!selectedCompanyId) return;
    try {
      await apiFetch(`/platform-admin/companies/${selectedCompanyId}/apply-setup-template`, { method: 'POST', body: { templateId, overwriteExisting: true } });
      setMessage('Setup template applied successfully.');
    } catch (error) {
      setMessage(error?.message || 'Failed to apply setup template');
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-emerald-700 font-semibold">Platform Management</div>
          <h1 className="mt-2 text-2xl font-bold text-zinc-900">Setup Templates</h1>
          <p className="mt-2 text-zinc-600">Save a finished company setup as a reusable template, then apply it to another company.</p>
          <div className="mt-4 max-w-sm">
            <select value={selectedCompanyId} onChange={(e) => setSelectedCompanyId(e.target.value)} className="w-full rounded-xl border px-3 py-2">
              <option value="">Select target company</option>
              {companies.map((company) => <option key={company._id} value={company._id}>{company.name}</option>)}
            </select>
          </div>
          {message ? <div className="mt-3 text-sm text-zinc-700">{message}</div> : null}
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => (
            <div key={template._id} className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="text-lg font-semibold text-zinc-900">{template.name}</div>
              <div className="mt-1 text-xs text-zinc-500">{template.code} • {template.category}</div>
              <div className="mt-3 text-sm text-zinc-600">{template.description || 'Reusable configuration template.'}</div>
              <button onClick={() => applyTemplate(template._id)} disabled={!selectedCompanyId} className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Apply to Selected Company</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
