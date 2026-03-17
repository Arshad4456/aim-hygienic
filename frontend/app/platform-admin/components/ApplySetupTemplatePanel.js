"use client";

import { useState } from "react";
import { apiFetch } from "../../lib/api";

export default function ApplySetupTemplatePanel({ companyId, templates, onApplied }) {
  const [templateId, setTemplateId] = useState(templates[0]?._id || "");
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function applyTemplate() {
    if (!templateId) return;
    setLoading(true);
    setMessage("");
    try {
      await apiFetch(`/platform-admin/companies/${companyId}/apply-setup-template`, {
        method: "POST",
        body: { templateId, overwriteExisting },
      });
      setMessage("Setup template applied successfully.");
      onApplied?.();
    } catch (error) {
      setMessage(error?.message || "Failed to apply setup template.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="text-lg font-semibold text-zinc-900">Apply Setup Template</div>
      <div className="mt-1 text-sm text-zinc-600">Reuse a saved company configuration to speed up onboarding.</div>
      <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
        <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className="flex-1 rounded-xl border px-3 py-2">
          <option value="">Select template</option>
          {templates.map((template) => (
            <option key={template._id} value={template._id}>{template.name}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input type="checkbox" checked={overwriteExisting} onChange={(e) => setOverwriteExisting(e.target.checked)} />
          Overwrite existing config
        </label>
        <button onClick={applyTemplate} disabled={!templateId || loading} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{loading ? "Applying..." : "Apply"}</button>
      </div>
      {message ? <div className="mt-3 text-sm text-zinc-700">{message}</div> : null}
    </div>
  );
}
