"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../../lib/api";

export default function RoleSelectionStep({ companyId, onMarkedDone }) {
  const [templates, setTemplates] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    apiFetch(`/platform-admin/companies/${companyId}/available-role-templates`)
      .then((data) => {
        const list = data.templates || data.roleTemplates || [];
        setTemplates(list);
        const mandatory = list.filter((role) => role.isMandatory).map((role) => role._id);
        setSelectedIds(mandatory);
      })
      .catch((error) => setMessage(error?.message || 'Failed to load available role templates'));
  }, [companyId]);

  function toggle(role) {
    if (role.isMandatory) return;
    setSelectedIds((prev) => prev.includes(role._id) ? prev.filter((id) => id !== role._id) : [...prev, role._id]);
  }

  async function assign() {
    try {
      await apiFetch(`/platform-admin/companies/${companyId}/roles`, { method: 'POST', body: { roleTemplateIds: selectedIds } });
      await apiFetch(`/platform-admin/companies/${companyId}/onboarding/step`, { method: 'PUT', body: { stepKey: 'rolesAssigned', currentStep: 5 } });
      onMarkedDone?.();
    } catch (error) {
      setMessage(error?.message || 'Failed to assign roles');
    }
  }

  return (
    <div className="space-y-3">
      {templates.map((role) => (
        <label key={role._id} className="flex items-center gap-2 rounded border px-3 py-2 text-sm">
          <input type="checkbox" checked={selectedIds.includes(role._id)} onChange={() => toggle(role)} disabled={role.isMandatory} />
          <span>{role.name} ({role.code}) {role.isMandatory ? '• mandatory' : ''}</span>
        </label>
      ))}
      {message ? <div className="text-sm text-zinc-700">{message}</div> : null}
      <button onClick={assign} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Assign Roles</button>
    </div>
  );
}
