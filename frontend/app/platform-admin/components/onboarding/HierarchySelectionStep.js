"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../../lib/api";

export default function HierarchySelectionStep({ companyId, onMarkedDone }) {
  const [templates, setTemplates] = useState([]);
  const [hierarchyCode, setHierarchyCode] = useState("");

  useEffect(() => {
    apiFetch("/platform-admin/hierarchy-templates")
      .then((data) => setTemplates(data.templates || []))
      .catch(() => undefined);
  }, []);

  async function assign() {
    if (!hierarchyCode) return;
    await apiFetch(`/platform-admin/companies/${companyId}/hierarchy`, {
      method: "POST",
      body: { hierarchyCode },
    });
    await apiFetch(`/platform-admin/companies/${companyId}/onboarding/step`, {
      method: "PUT",
      body: { stepKey: "hierarchyAssigned", currentStep: 4 },
    });
    onMarkedDone?.();
  }

  return (
    <div className="space-y-3">
      <select value={hierarchyCode} onChange={(e) => setHierarchyCode(e.target.value)} className="w-full rounded-lg border px-3 py-2">
        <option value="">Select hierarchy template</option>
        {templates.map((t) => <option key={t._id} value={t.code}>{t.name}</option>)}
      </select>
      <button onClick={assign} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Assign Hierarchy</button>
    </div>
  );
}