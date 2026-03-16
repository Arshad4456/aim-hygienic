"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../../lib/api";

export default function HierarchySelectionStep({ companyId, onMarkedDone }) {
  const [templates, setTemplates] = useState([]);
  const [hierarchyTemplateId, setHierarchyTemplateId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadTemplates() {
    setLoading(true); setError("");
    try {
      const data = await apiFetch("/platform-admin/hierarchy-templates");
      const list = data.templates || [];
      setTemplates(list);
      if (list[0]?._id) setHierarchyTemplateId(String(list[0]._id));
    } catch (e) { setError(e.message || 'Failed to load hierarchy templates'); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadTemplates(); }, []);

  async function assign() {
    if (!hierarchyTemplateId) return;
    await apiFetch(`/platform-admin/companies/${companyId}/hierarchy`, { method: "POST", body: { hierarchyTemplateId } });
    await apiFetch(`/platform-admin/companies/${companyId}/onboarding/step`, { method: "PUT", body: { stepKey: "hierarchyAssigned", currentStep: 4 } });
    onMarkedDone?.();
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-600">Choose the hierarchy template that should control role availability and territory-related modules for this company.</p>
      {error ? <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
      <select value={hierarchyTemplateId} onChange={(e) => setHierarchyTemplateId(e.target.value)} className="w-full rounded-lg border px-3 py-2" disabled={loading || !templates.length}>
        <option value="">Select hierarchy template</option>
        {templates.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
      </select>
      {!loading && !templates.length ? <button onClick={loadTemplates} className="rounded-lg border px-4 py-2 text-sm font-semibold">Reload templates</button> : null}
      <button onClick={assign} disabled={!hierarchyTemplateId} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Assign Hierarchy</button>
    </div>
  );
}
