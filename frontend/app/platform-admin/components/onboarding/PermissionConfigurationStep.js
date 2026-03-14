"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../lib/api";

export default function PermissionConfigurationStep({ companyId, onMarkedDone }) {
  const [roles, setRoles] = useState([]);
  const [roleCode, setRoleCode] = useState("");
  const [modules, setModules] = useState([]);
  const [moduleCode, setModuleCode] = useState("");
  const [allowedActions, setAllowedActions] = useState([]);
  const [templateMeta, setTemplateMeta] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch(`/platform-admin/companies/${companyId}/dashboards`)
      .then((data) => {
        const list = data.dashboards || [];
        setRoles(list);
        setRoleCode(list[0]?.roleCode || "");
      })
      .catch((err) => setError(err.message || "Failed to load dashboards"));
  }, [companyId]);

  useEffect(() => {
    if (!roleCode) return;
    apiFetch(`/platform-admin/companies/${companyId}/dashboards/${roleCode}/modules`)
      .then((data) => {
        const list = data.modules || [];
        setModules(list);
        setModuleCode(list[0]?.moduleCode || "");
      })
      .catch((err) => setError(err.message || "Failed to load assigned modules"));
  }, [companyId, roleCode]);

  useEffect(() => {
    const current = modules.find((m) => m.moduleCode === moduleCode);
    if (!current?.moduleTemplateId) {
      setTemplateMeta(null);
      setAllowedActions([]);
      return;
    }
    apiFetch(`/platform-admin/module-templates/${current.moduleTemplateId}`)
      .then((data) => {
        const template = data.template || null;
        setTemplateMeta(template);
        setAllowedActions(template?.supportedActions || []);
      })
      .catch(() => {
        setTemplateMeta(null);
      });
  }, [modules, moduleCode]);

  const candidateActions = useMemo(() => templateMeta?.supportedActions || [], [templateMeta]);

  function toggle(action) {
    setAllowedActions((prev) => prev.includes(action) ? prev.filter((a) => a !== action) : [...prev, action]);
  }

  async function savePermission() {
    if (!roleCode || !moduleCode) return;
    setSaving(true);
    setError("");
    try {
      await apiFetch(`/platform-admin/companies/${companyId}/dashboards/${roleCode}/modules/${moduleCode}/permissions`, {
        method: "POST",
        body: { allowedActions, sectionPermissions: [] },
      });
      await apiFetch(`/platform-admin/companies/${companyId}/onboarding/step`, {
        method: "PUT",
        body: { stepKey: "permissionsConfigured", currentStep: 8 },
      });
      onMarkedDone?.();
    } catch (err) {
      setError(err.message || "Failed to save permissions");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <select value={roleCode} onChange={(e) => setRoleCode(e.target.value)} className="w-full rounded-lg border px-3 py-2">
          {roles.map((r) => <option key={r._id} value={r.roleCode}>{r.roleName} ({r.roleCode})</option>)}
        </select>
        <select value={moduleCode} onChange={(e) => setModuleCode(e.target.value)} className="w-full rounded-lg border px-3 py-2">
          {modules.map((m) => <option key={m._id} value={m.moduleCode}>{m.moduleName} ({m.moduleCode})</option>)}
        </select>
      </div>
      <div className="text-sm text-zinc-600">Choose which actions this role can perform in the selected module. Use the module template's supported actions as the source of truth.</div>
      <div className="flex flex-wrap gap-2">
        {candidateActions.map((action) => (
          <label key={action} className="rounded border px-3 py-1.5 text-sm flex items-center gap-2 bg-white">
            <input type="checkbox" checked={allowedActions.includes(action)} onChange={() => toggle(action)} /> {action}
          </label>
        ))}
        {!candidateActions.length ? <div className="text-sm text-zinc-500">No supported actions found for this module template yet.</div> : null}
      </div>
      {error ? <div className="text-sm text-red-600">{error}</div> : null}
      <button disabled={!roleCode || !moduleCode || saving} onClick={savePermission} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving..." : "Save Permissions & Continue"}</button>
    </div>
  );
}
