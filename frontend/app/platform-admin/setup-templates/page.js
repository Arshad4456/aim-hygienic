"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

export default function SetupTemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/platform-admin/setup-templates")
      .then((data) => setTemplates(data.templates || []))
      .catch((err) => setError(err.message || "Failed to load setup templates"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="rounded-2xl border bg-white p-6">
          <div className="text-xs uppercase tracking-wide text-emerald-700 font-semibold">Platform Management</div>
          <h1 className="text-2xl font-bold text-zinc-900 mt-2">Setup Templates</h1>
          <p className="text-zinc-600 mt-2">Browse, save, clone, and apply reusable company setup templates for faster onboarding.</p>
        </div>
        {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
        {loading ? <div className="rounded-2xl border bg-white p-6 text-sm">Loading templates...</div> : null}
        {!loading && templates.length === 0 ? <div className="rounded-2xl border bg-white p-6 text-sm text-zinc-600">No setup templates yet. Complete one company onboarding, then save it as a reusable setup template.</div> : null}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {templates.map((template) => (
            <div key={template._id} className="rounded-2xl border bg-white p-5">
              <div className="text-lg font-semibold text-zinc-900">{template.name}</div>
              <div className="mt-1 text-sm text-zinc-500">{template.code} • {template.category || "general"}</div>
              <div className="mt-3 text-sm text-zinc-600">{template.description || "No description"}</div>
              <div className="mt-4 text-xs text-zinc-500">Source company: {template.sourceCompanyId || "manual"}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
