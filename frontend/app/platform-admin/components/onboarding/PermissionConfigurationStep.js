"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../lib/api";

export default function PermissionConfigurationStep({ companyId, onMarkedDone }) {
  const [roles, setRoles] = useState([]);
  const [roleCode, setRoleCode] = useState("");
  const [modules, setModules] = useState([]);
  const [moduleCode, setModuleCode] = useState("");
  const [allowedActions, setAllowedActions] = useState([]);
  const [candidateActions, setCandidateActions] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    apiFetch(`/platform-admin/companies/${companyId}/dashboards`)
      .then((data) => {
        const list = data.dashboards || [];
        setRoles(list);
        setRoleCode(list[0]?.roleCode || "");
      })
      .catch((error) => setMessage(error?.message || 'Failed to load dashboards'));
  }, [companyId]);

  useEffect(() => {
    if (!roleCode) return;
    apiFetch(`/platform-admin/companies/${companyId}/dashboards/${roleCode}/modules`)
      .then((data) => {
        const list = data.modules || [];
        setModules(list);
        setModuleCode(list[0]?.moduleCode || "");
      })
      .catch((error) => setMessage(error?.message || 'Failed to load role modules'));
  }, [companyId, roleCode]);

  useEffect(() => {
    if (!moduleCode) return;
    apiFetch(`/platform-admin/module-templates/${moduleCode}/actions`)
      .then((data) => {
        const actions = data?.module?.supportedActions || [];
        setCandidateActions(actions);
        setAllowedActions(actions);
      })
      .catch(() => {
        setCandidateActions(["create", "read", "update", "delete", "approve", "dispatch"]);
        setAllowedActions(["read"]);
      });
  }, [moduleCode]);

  const moduleLabel = useMemo(() => modules.find((item) => item.moduleCode === moduleCode)?.moduleName || moduleCode, [modules, moduleCode]);

  function toggle(action) {
    setAllowedActions((prev) => (prev.includes(action) ? prev.filter((a) => a !== action) : [...prev, action]));
  }

  async function savePermission() {
    if (!roleCode || !moduleCode) return;
    try {
      await apiFetch(`/platform-admin/companies/${companyId}/dashboards/${roleCode}/modules/${moduleCode}/permissions`, { method: 'POST', body: { allowedActions, sectionPermissions: [] } });
      await apiFetch(`/platform-admin/companies/${companyId}/onboarding/step`, { method: 'PUT', body: { stepKey: 'permissionsConfigured', currentStep: 8 } });
      onMarkedDone?.();
    } catch (error) {
      setMessage(error?.message || 'Failed to save permissions');
    }
  }

  return (
    <div className="space-y-3">
      <select value={roleCode} onChange={(e) => setRoleCode(e.target.value)} className="w-full rounded-lg border px-3 py-2">
        {roles.map((r) => <option key={r._id} value={r.roleCode}>{r.roleName} ({r.roleCode})</option>)}
      </select>
      <select value={moduleCode} onChange={(e) => setModuleCode(e.target.value)} className="w-full rounded-lg border px-3 py-2">
        {modules.map((m) => <option key={m._id} value={m.moduleCode}>{m.moduleName} ({m.moduleCode})</option>)}
      </select>
      <div className="rounded-lg border bg-zinc-50 p-3 text-sm text-zinc-700">Allowed actions for <span className="font-semibold">{moduleLabel}</span></div>
      <div className="flex flex-wrap gap-2">
        {candidateActions.map((action) => (
          <label key={action} className="rounded border px-3 py-1.5 text-sm flex items-center gap-2">
            <input type="checkbox" checked={allowedActions.includes(action)} onChange={() => toggle(action)} /> {action}
          </label>
        ))}
      </div>
      {message ? <div className="text-sm text-zinc-700">{message}</div> : null}
      <button onClick={savePermission} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Save Permission & Continue</button>
    </div>
  );
}
