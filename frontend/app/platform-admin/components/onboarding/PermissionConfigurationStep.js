"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../lib/api";

export default function PermissionConfigurationStep({ companyId, onMarkedDone }) {
  const [roles, setRoles] = useState([]);
  const [roleCode, setRoleCode] = useState("");
  const [modules, setModules] = useState([]);
  const [moduleCode, setModuleCode] = useState("");
  const [allowedActions, setAllowedActions] = useState([]);

  useEffect(() => {
    apiFetch(`/platform-admin/companies/${companyId}/dashboards`)
      .then((data) => {
        const list = data.dashboards || [];
        setRoles(list);
        const first = list[0]?.roleCode || "";
        setRoleCode(first);
      })
      .catch(() => undefined);
  }, [companyId]);

  useEffect(() => {
    if (!roleCode) return;
    apiFetch(`/platform-admin/companies/${companyId}/dashboards/${roleCode}/modules`)
      .then((data) => {
        const list = data.modules || [];
        setModules(list);
        setModuleCode(list[0]?.moduleCode || "");
      })
      .catch(() => undefined);
  }, [companyId, roleCode]);

  const candidateActions = useMemo(() => ["view", "create", "update", "delete", "approve", "dispatch"], []);

  function toggle(action) {
    setAllowedActions((prev) => (prev.includes(action) ? prev.filter((a) => a !== action) : [...prev, action]));
  }

  async function savePermission() {
    if (!roleCode || !moduleCode) return;

    await apiFetch(`/platform-admin/companies/${companyId}/dashboards/${roleCode}/modules/${moduleCode}/permissions`, {
      method: "POST",
      body: { allowedActions, sectionPermissions: [] },
    });

    await apiFetch(`/platform-admin/companies/${companyId}/onboarding/step`, {
      method: "PUT",
      body: { stepKey: "permissionsConfigured", currentStep: 8 },
    });

    onMarkedDone?.();
  }

  return (
    <div className="space-y-3">
      <select value={roleCode} onChange={(e) => setRoleCode(e.target.value)} className="w-full rounded-lg border px-3 py-2">
        {roles.map((r) => <option key={r._id} value={r.roleCode}>{r.roleName} ({r.roleCode})</option>)}
      </select>

      <select value={moduleCode} onChange={(e) => setModuleCode(e.target.value)} className="w-full rounded-lg border px-3 py-2">
        {modules.map((m) => <option key={m._id} value={m.moduleCode}>{m.moduleName} ({m.moduleCode})</option>)}
      </select>

      <div className="flex flex-wrap gap-2">
        {candidateActions.map((action) => (
          <label key={action} className="rounded border px-3 py-1.5 text-sm flex items-center gap-2">
            <input type="checkbox" checked={allowedActions.includes(action)} onChange={() => toggle(action)} /> {action}
          </label>
        ))}
      </div>

      <button onClick={savePermission} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Save Permission & Continue</button>
    </div>
  );
}
