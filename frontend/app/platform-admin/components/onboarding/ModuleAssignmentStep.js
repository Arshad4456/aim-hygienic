"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../lib/api";

export default function ModuleAssignmentStep({ companyId, onMarkedDone }) {
  const [dashboards, setDashboards] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [roleCode, setRoleCode] = useState("");
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    Promise.all([
      apiFetch(`/platform-admin/companies/${companyId}/dashboards`),
      apiFetch(`/platform-admin/companies/${companyId}/available-modules`),
    ]).then(([dRes, tRes]) => {
      const d = dRes.dashboards || [];
      setDashboards(d);
      setRoleCode(d[0]?.roleCode || "");
      setTemplates(tRes.moduleTemplates || []);
    }).catch(() => undefined);
  }, [companyId]);

  function toggle(code) {
    setSelected((prev) => (prev.includes(code) ? prev.filter((x) => x !== code) : [...prev, code]));
  }

  const selectedModules = useMemo(
    () => templates.filter((t) => selected.includes(t.code)).map((t, idx) => ({
      moduleCode: t.code,
      selectedSubtypes: t.subtypes || [],
      selectedSections: t.sections || [],
      sidebarLabel: t.name,
      sidebarPath: `/runtime-dashboard/${t.code}`,
      sidebarOrder: idx + 1,
    })),
    [selected, templates]
  );

  async function assign() {
    if (!roleCode || !selectedModules.length) return;
    await apiFetch(`/platform-admin/companies/${companyId}/dashboards/${roleCode}/modules`, {
      method: "POST",
      body: { modules: selectedModules },
    });

    await apiFetch(`/platform-admin/companies/${companyId}/onboarding/step`, {
      method: "PUT",
      body: { stepKey: "modulesAssigned", currentStep: 7 },
    });
    onMarkedDone?.();
  }

  return (
    <div className="space-y-3">
      <select value={roleCode} onChange={(e) => setRoleCode(e.target.value)} className="w-full rounded-lg border px-3 py-2">
        <option value="">Select role dashboard</option>
        {dashboards.map((d) => <option key={d._id} value={d.roleCode}>{d.roleName} ({d.roleCode})</option>)}
      </select>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {templates.map((m) => (
          <label key={m._id} className="rounded border px-3 py-2 text-sm flex items-center gap-2">
            <input type="checkbox" checked={selected.includes(m.code)} onChange={() => toggle(m.code)} />
            <span>{m.name} ({m.code})</span>
          </label>
        ))}
      </div>

      <button onClick={assign} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Assign Modules</button>
    </div>
  );
}
