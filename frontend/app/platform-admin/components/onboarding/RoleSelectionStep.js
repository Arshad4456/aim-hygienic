"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../lib/api";

export default function RoleSelectionStep({ companyId, onMarkedDone }) {
  const [templates, setTemplates] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch(`/platform-admin/companies/${companyId}/available-role-templates`)
      .then((data) => {
        const list = data.templates || [];
        setTemplates(list);
        const mandatory = list.filter((item) => item.isMandatory).map((item) => item._id);
        setSelectedIds(mandatory);
      })
      .catch((e) => setError(e.message || 'Failed to load role templates'));
  }, [companyId]);

  const mandatoryIds = useMemo(() => templates.filter((item) => item.isMandatory).map((item) => String(item._id)), [templates]);

  function toggle(id) {
    if (mandatoryIds.includes(String(id))) return;
    setSelectedIds((prev) => (prev.includes(String(id)) ? prev.filter((x) => x !== String(id)) : [...prev, String(id)]));
  }

  async function assign() {
    const finalIds = [...new Set([...selectedIds, ...mandatoryIds])];
    await apiFetch(`/platform-admin/companies/${companyId}/roles`, { method: "POST", body: { roleTemplateIds: finalIds } });
    await apiFetch(`/platform-admin/companies/${companyId}/onboarding/step`, { method: "PUT", body: { stepKey: "rolesAssigned", currentStep: 5 } });
    onMarkedDone?.();
  }

  return (
    <div className="space-y-3">
      {error ? <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
      {templates.map((role) => {
        const checked = selectedIds.includes(String(role._id)) || role.isMandatory;
        return (
          <label key={role._id} className="flex items-center gap-2 text-sm rounded border px-3 py-2">
            <input type="checkbox" checked={checked} disabled={role.isMandatory} onChange={() => toggle(role._id)} />
            <span>{role.name} ({role.code}) {role.isMandatory ? '• required' : ''}</span>
          </label>
        );
      })}
      <button onClick={assign} className="mt-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Assign Roles</button>
    </div>
  );
}
