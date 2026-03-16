"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../lib/api";

const ROLE_MODULE_SUGGESTIONS = {
  company_admin: ['territory_assets','hr_role_management','order_management','payment_management','expense_management','finance_accounts','vehicle_management'],
  admin: ['territory_assets','hr_role_management','order_management','payment_management','expense_management','finance_accounts','vehicle_management'],
  warehouse_manager: ['territory_assets','order_management','payment_management','vehicle_management'],
  distributor: ['order_management','payment_management','expense_management','finance_accounts'],
  order_booker: ['order_management','finance_accounts'],
  salesman: ['order_management','finance_accounts','vehicle_management'],
  customer: ['order_management','finance_accounts'],
  account_officer: ['payment_management','expense_management','finance_accounts'],
};

export default function ModuleAssignmentStep({ companyId, onMarkedDone }) {
  const [dashboards, setDashboards] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [roleCode, setRoleCode] = useState("");
  const [selected, setSelected] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      apiFetch(`/platform-admin/companies/${companyId}/dashboards`),
      apiFetch(`/platform-admin/companies/${companyId}/available-modules`),
    ]).then(([dRes, tRes]) => {
      const d = dRes.dashboards || [];
      const modules = tRes.templates || tRes.moduleTemplates || [];
      setDashboards(d);
      setTemplates(modules);
      const firstRole = d[0]?.roleCode || "";
      setRoleCode(firstRole);
    }).catch((e) => setError(e.message || 'Failed to load module assignment data'));
  }, [companyId]);

  useEffect(() => {
    if (!roleCode) return;
    setSelected(ROLE_MODULE_SUGGESTIONS[roleCode] || []);
  }, [roleCode]);

  function toggle(code) {
    setSelected((prev) => (prev.includes(code) ? prev.filter((x) => x !== code) : [...prev, code]));
  }

  const selectedModules = useMemo(
    () => templates.filter((t) => selected.includes(t.code)).map((t, idx) => ({
      moduleTemplateId: t._id,
      moduleType: (t.types && t.types[0]) || 'default',
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
    await apiFetch(`/platform-admin/companies/${companyId}/dashboards/${roleCode}/modules`, { method: "POST", body: { modules: selectedModules } });
    await apiFetch(`/platform-admin/companies/${companyId}/onboarding/step`, { method: "PUT", body: { stepKey: "modulesAssigned", currentStep: 7 } });
    onMarkedDone?.();
  }

  const sortedTemplates = useMemo(() => {
    const preferred = new Set(ROLE_MODULE_SUGGESTIONS[roleCode] || []);
    return [...templates].sort((a,b) => {
      const pa = preferred.has(a.code) ? 0 : 1; const pb = preferred.has(b.code) ? 0 : 1;
      if (pa !== pb) return pa - pb;
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
  }, [templates, roleCode]);

  return (
    <div className="space-y-3">
      {error ? <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
      <select value={roleCode} onChange={(e) => setRoleCode(e.target.value)} className="w-full rounded-lg border px-3 py-2">
        <option value="">Select role dashboard</option>
        {dashboards.map((d) => <option key={d._id} value={d.roleCode}>{d.roleName} ({d.roleCode})</option>)}
      </select>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[26rem] overflow-auto rounded-xl border p-3">
        {sortedTemplates.map((m) => {
          const suggested = (ROLE_MODULE_SUGGESTIONS[roleCode] || []).includes(m.code);
          return (
            <label key={m._id} className={`rounded border px-3 py-2 text-sm flex items-center gap-2 ${suggested ? 'border-emerald-300 bg-emerald-50' : ''}`}>
              <input type="checkbox" checked={selected.includes(m.code)} onChange={() => toggle(m.code)} />
              <span>{m.name} ({m.code}) {suggested ? '• suggested' : ''}</span>
            </label>
          );
        })}
      </div>

      <button onClick={assign} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Assign Modules</button>
    </div>
  );
}
