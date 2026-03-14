"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";

export default function SetupTemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch('/platform-admin/setup-templates')
      .then((data) => setTemplates(data.templates || []))
      .catch((e) => setError(e.message || 'Failed to load setup templates'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="rounded-2xl border bg-white p-6">
          <div className="text-xs uppercase tracking-wide text-emerald-700 font-semibold">Platform Management</div>
          <h1 className="text-2xl font-bold text-zinc-900 mt-2">Setup Templates</h1>
          <p className="text-zinc-600 mt-2">Browse and reuse company setup templates for faster onboarding.</p>
        </div>
        {loading ? <div className="text-sm text-zinc-600">Loading setup templates...</div> : null}
        {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map((template) => (
            <div key={template._id} className="rounded-2xl border bg-white p-5">
              <div className="font-semibold text-zinc-900">{template.name}</div>
              <div className="text-sm text-zinc-500 mt-1">{template.code} • {template.category || 'general'}</div>
              <div className="text-sm text-zinc-600 mt-3">{template.description || 'Reusable company onboarding template.'}</div>
            </div>
          ))}
          {!loading && !error && templates.length === 0 ? <div className="rounded-2xl border bg-white p-6 text-sm text-zinc-500">No setup templates available yet.</div> : null}
        </div>
      </div>
    </div>
  );
}
