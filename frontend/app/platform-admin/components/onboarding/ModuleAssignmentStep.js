"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../lib/api";

const ROLE_SUGGESTIONS = {
  company_admin: ["territory_assets", "hr_role_management", "order_management", "payment_management", "finance_accounts", "vehicle_management"],
  warehouse_manager: ["territory_assets", "order_management", "payment_management", "vehicle_management"],
  distributor: ["order_management", "payment_management", "finance_accounts"],
  order_booker: ["order_management"],
  customer: ["order_management", "finance_accounts"],
  salesman: ["order_management", "vehicle_management"],
};

export default function ModuleAssignmentStep({ companyId, onMarkedDone }) {
  const [dashboards, setDashboards] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [roleCode, setRoleCode] = useState("");
  const [selected, setSelected] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    Promise.all([
      apiFetch(`/platform-admin/companies/${companyId}/dashboards`),
      apiFetch(`/platform-admin/companies/${companyId}/available-modules`),
    ]).then(([dRes, tRes]) => {
      const d = dRes.dashboards || [];
      setDashboards(d);
      const firstRole = d[0]?.roleCode || "";
      setRoleCode(firstRole);
      const moduleTemplates = tRes.templates || tRes.moduleTemplates || [];
      setTemplates(moduleTemplates);
      setSelected(ROLE_SUGGESTIONS[firstRole] || []);
    }).catch((error) => setMessage(error?.message || 'Failed to load dashboards/modules'));
  }, [companyId]);

  useEffect(() => {
    if (!roleCode) return;
    setSelected((prev) => prev.length ? prev : (ROLE_SUGGESTIONS[roleCode] || []));
  }, [roleCode]);

  function toggle(code) {
    setSelected((prev) => (prev.includes(code) ? prev.filter((x) => x !== code) : [...prev, code]));
  }

  const selectedModules = useMemo(
    () => templates.filter((t) => selected.includes(t.code)).map((t, idx) => ({
      moduleTemplateId: t._id,
      moduleType: t.types?.[0] || null,
      selectedSubtypes: t.subtypes || [],
      selectedSections: t.sections || [],
      sidebarLabel: t.name,
      sidebarPath: `/runtime-dashboard/${t.code}`,
      sidebarOrder: idx + 1,
    })),
    [selected, templates]
  );

  async function assign() {
    if (!roleCode) return;
    try {
      await apiFetch(`/platform-admin/companies/${companyId}/dashboards/${roleCode}/modules`, { method: 'POST', body: { modules: selectedModules } });
      await apiFetch(`/platform-admin/companies/${companyId}/onboarding/step`, { method: 'PUT', body: { stepKey: 'modulesAssigned', currentStep: 7 } });
      onMarkedDone?.();
    } catch (error) {
      setMessage(error?.message || 'Failed to assign modules');
    }
  }

  const orderedTemplates = useMemo(() => {
    const suggestions = new Set(ROLE_SUGGESTIONS[roleCode] || []);
    return [...templates].sort((a, b) => Number(!suggestions.has(a.code)) - Number(!suggestions.has(b.code)) || a.name.localeCompare(b.name));
  }, [templates, roleCode]);

  return (
    <div className="space-y-3">
      <select value={roleCode} onChange={(e) => { setRoleCode(e.target.value); setSelected(ROLE_SUGGESTIONS[e.target.value] || []); }} className="w-full rounded-lg border px-3 py-2">
        <option value="">Select role dashboard</option>
        {dashboards.map((d) => <option key={d._id} value={d.roleCode}>{d.roleName} ({d.roleCode})</option>)}
      </select>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {orderedTemplates.map((m) => (
          <label key={m._id} className="rounded border px-3 py-2 text-sm flex items-center gap-2">
            <input type="checkbox" checked={selected.includes(m.code)} onChange={() => toggle(m.code)} />
            <span>{m.name} ({m.code})</span>
          </label>
        ))}
      </div>
      {message ? <div className="text-sm text-zinc-700">{message}</div> : null}
      <button onClick={assign} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Assign Modules</button>
    </div>
  );
}
