"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../../lib/api";

export default function HierarchySelectionStep({ companyId, onMarkedDone }) {
  const [templates, setTemplates] = useState([]);
  const [hierarchyTemplateId, setHierarchyTemplateId] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    apiFetch('/platform-admin/hierarchy-templates')
      .then((data) => {
        const list = data.templates || data.hierarchyTemplates || [];
        setTemplates(list);
        setHierarchyTemplateId(list[0]?._id || "");
      })
      .catch((error) => setMessage(error?.message || 'Failed to load hierarchy templates'));
  }, []);

  async function assign() {
    if (!hierarchyTemplateId) return;
    try {
      await apiFetch(`/platform-admin/companies/${companyId}/hierarchy`, { method: 'POST', body: { hierarchyTemplateId } });
      await apiFetch(`/platform-admin/companies/${companyId}/onboarding/step`, { method: 'PUT', body: { stepKey: 'hierarchyAssigned', currentStep: 4 } });
      onMarkedDone?.();
    } catch (error) {
      setMessage(error?.message || 'Failed to assign hierarchy');
    }
  }

  return (
    <div className="space-y-4">
      <select value={hierarchyTemplateId} onChange={(e) => setHierarchyTemplateId(e.target.value)} className="w-full rounded-lg border px-3 py-2">
        <option value="">Select hierarchy template</option>
        {templates.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
      </select>
      {message ? <div className="text-sm text-zinc-700">{message}</div> : null}
      <button onClick={assign} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Assign Hierarchy</button>
    </div>
  );
}
