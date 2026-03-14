"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../lib/api";

export default function RoleSelectionStep({ companyId, onMarkedDone }) {
  const [templates, setTemplates] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch(`/platform-admin/companies/${companyId}/available-role-templates`)
      .then((data) => {
        const list = data.templates || [];
        setTemplates(list);
        const defaults = list.filter((item) => item.isMandatory || item.code === "company_admin").map((item) => item._id);
        setSelectedIds(defaults);
      })
      .catch((err) => setError(err.message || "Failed to load role templates"));
  }, [companyId]);

  const mandatoryIds = useMemo(() => new Set(templates.filter((t) => t.isMandatory || t.code === "company_admin").map((t) => t._id)), [templates]);

  function toggle(id) {
    if (mandatoryIds.has(id)) return;
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  async function assign() {
    if (!selectedIds.length) return;
    setSaving(true);
    setError("");
    try {
      await apiFetch(`/platform-admin/companies/${companyId}/roles`, {
        method: "POST",
        body: { roleTemplateIds: selectedIds },
      });
      await apiFetch(`/platform-admin/companies/${companyId}/onboarding/step`, {
        method: "PUT",
        body: { stepKey: "rolesAssigned", currentStep: 5 },
      });
      onMarkedDone?.();
    } catch (err) {
      setError(err.message || "Failed to assign roles");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-zinc-600">Select the roles that this company needs. Mandatory roles are locked and will always be included.</div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {templates.map((role) => {
          const checked = selectedIds.includes(role._id);
          const locked = mandatoryIds.has(role._id);
          return (
            <label key={role._id} className={`rounded-xl border p-4 text-sm ${checked ? "border-emerald-400 bg-emerald-50" : "bg-white"}`}>
              <div className="flex items-start gap-3">
                <input type="checkbox" checked={checked} disabled={locked} onChange={() => toggle(role._id)} className="mt-1" />
                <div>
                  <div className="font-medium text-zinc-900">{role.name}</div>
                  <div className="text-zinc-500">{role.code}</div>
                  {role.description ? <div className="mt-1 text-zinc-600">{role.description}</div> : null}
                  {locked ? <div className="mt-2 text-xs font-medium text-emerald-700">Mandatory</div> : null}
                </div>
              </div>
            </label>
          );
        })}
      </div>
      {error ? <div className="text-sm text-red-600">{error}</div> : null}
      <button disabled={!selectedIds.length || saving} onClick={assign} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving..." : "Assign Roles"}</button>
    </div>
  );
}
