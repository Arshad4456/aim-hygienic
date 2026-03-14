"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../lib/api";

export default function ModuleAssignmentStep({ companyId, onMarkedDone }) {
  const [dashboards, setDashboards] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [roleCode, setRoleCode] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      apiFetch(`/platform-admin/companies/${companyId}/dashboards`),
      apiFetch(`/platform-admin/available-modules`).catch(() => apiFetch(`/platform-admin/module-templates`)),
    ]).then(([dRes, tRes]) => {
      const d = dRes.dashboards || [];
      setDashboards(d);
      setRoleCode(d[0]?.roleCode || "");
      setTemplates(tRes.moduleTemplates || tRes.templates || []);
    }).catch((err) => setError(err.message || "Failed to load dashboards/modules"));
  }, [companyId]);

  function toggle(id) {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  const selectedModules = useMemo(() => templates.filter((t) => selectedIds.includes(t._id)).map((t, idx) => ({
    moduleTemplateId: t._id,
    moduleType: t.types?.[0] || null,
    selectedSubtypes: Array.isArray(t.subtypes) ? t.subtypes : [],
    selectedSections: Array.isArray(t.sections) ? t.sections : [],
    sidebarOrder: idx + 1,
  })), [selectedIds, templates]);

  async function assign() {
    if (!roleCode || !selectedModules.length) return;
    setSaving(true);
    setError("");
    try {
      await apiFetch(`/platform-admin/companies/${companyId}/dashboards/${roleCode}/modules`, {
        method: "POST",
        body: { modules: selectedModules },
      });
      await apiFetch(`/platform-admin/companies/${companyId}/onboarding/step`, {
        method: "PUT",
        body: { stepKey: "modulesAssigned", currentStep: 7 },
      });
      onMarkedDone?.();
    } catch (err) {
      setError(err.message || "Failed to assign modules");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[280px_1fr]">
        <div>
          <div className="mb-1 text-sm font-medium">Target role dashboard</div>
          <select value={roleCode} onChange={(e) => setRoleCode(e.target.value)} className="w-full rounded-lg border px-3 py-2">
            <option value="">Select role dashboard</option>
            {dashboards.map((d) => <option key={d._id} value={d.roleCode}>{d.roleName} ({d.roleCode})</option>)}
          </select>
        </div>
        <div className="text-sm text-zinc-600 self-end">Choose module families for this role. Selected module types, subtypes, and sections will be saved automatically using current template defaults.</div>
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {templates.map((m) => {
          const checked = selectedIds.includes(m._id);
          return (
            <label key={m._id} className={`rounded-xl border p-4 text-sm ${checked ? "border-emerald-400 bg-emerald-50" : "bg-white"}`}>
              <div className="flex items-start gap-3">
                <input type="checkbox" checked={checked} onChange={() => toggle(m._id)} className="mt-1" />
                <div className="space-y-2">
                  <div>
                    <div className="font-medium text-zinc-900">{m.name}</div>
                    <div className="text-zinc-500">{m.code}</div>
                  </div>
                  {m.types?.length ? <div className="text-xs text-zinc-600">Types: {m.types.join(", ")}</div> : null}
                  {m.subtypes?.length ? <div className="text-xs text-zinc-600">Subtypes: {m.subtypes.join(", ")}</div> : null}
                  {m.sections?.length ? <div className="text-xs text-zinc-600">Sections: {m.sections.join(", ")}</div> : null}
                </div>
              </div>
            </label>
          );
        })}
      </div>
      {error ? <div className="text-sm text-red-600">{error}</div> : null}
      <button disabled={!roleCode || !selectedModules.length || saving} onClick={assign} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Assigning..." : "Assign Modules"}</button>
    </div>
  );
}
