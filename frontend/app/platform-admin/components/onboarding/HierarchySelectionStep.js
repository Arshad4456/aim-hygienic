"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../lib/api";

export default function HierarchySelectionStep({ companyId, onMarkedDone }) {
  const [templates, setTemplates] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadTemplates() {
    setError("");
    try {
      const data = await apiFetch("/platform-admin/hierarchy-templates");
      setTemplates(data.templates || []);
    } catch (err) {
      setError(err.message || "Failed to load hierarchy templates");
    }
  }

  useEffect(() => {
    loadTemplates();
  }, []);

  const selectedTemplate = useMemo(() => templates.find((item) => item._id === selectedId), [templates, selectedId]);

  async function assign() {
    if (!selectedId) return;
    setSaving(true);
    setError("");
    try {
      await apiFetch(`/platform-admin/companies/${companyId}/hierarchy`, {
        method: "POST",
        body: { hierarchyTemplateId: selectedId },
      });
      await apiFetch(`/platform-admin/companies/${companyId}/onboarding/step`, {
        method: "PUT",
        body: { stepKey: "hierarchyAssigned", currentStep: 4 },
      });
      onMarkedDone?.();
    } catch (err) {
      setError(err.message || "Failed to assign hierarchy");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-zinc-600">Choose the hierarchy template that should control role availability and territory-related modules for this company.</div>
      <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="w-full rounded-lg border px-3 py-2">
        <option value="">Select hierarchy template</option>
        {templates.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
      </select>
      {selectedTemplate ? (
        <div className="rounded-xl border bg-zinc-50 p-4 text-sm">
          <div className="font-medium text-zinc-900">{selectedTemplate.name}</div>
          <div className="mt-1 text-zinc-600">{selectedTemplate.description || "No description"}</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {(selectedTemplate.levels || []).map((level) => (
              <span key={level.key || level.label} className="rounded-full border px-3 py-1">{level.label || level.key}</span>
            ))}
          </div>
        </div>
      ) : null}
      {templates.length === 0 ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">No hierarchy templates were found. The platform will auto-seed defaults on first load; click reload if this is the first time you opened onboarding. <button type="button" onClick={loadTemplates} className="ml-2 font-semibold underline">Reload</button></div> : null}
      {error ? <div className="text-sm text-red-600">{error}</div> : null}
      <button disabled={!selectedId || saving} onClick={assign} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Assigning..." : "Assign Hierarchy"}</button>
    </div>
  );
}
