"use client";

import { useMemo, useState } from "react";
import { apiFetch } from "../../lib/api";

export default function RoleModuleMatrix({ companyId, matrix, templates, onChanged }) {
  const [activeRoleCode, setActiveRoleCode] = useState(matrix[0]?.roleCode || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedByRole, setSelectedByRole] = useState(() => Object.fromEntries(matrix.map((row) => [row.roleCode, (row.assignedModules || []).map((m) => m.moduleCode)])));

  const activeRow = useMemo(() => matrix.find((row) => row.roleCode === activeRoleCode) || null, [matrix, activeRoleCode]);
  const activeSelected = selectedByRole[activeRoleCode] || [];

  function toggle(moduleCode) {
    setSelectedByRole((prev) => {
      const current = prev[activeRoleCode] || [];
      const next = current.includes(moduleCode) ? current.filter((code) => code !== moduleCode) : [...current, moduleCode];
      return { ...prev, [activeRoleCode]: next };
    });
  }

  async function saveRoleModules() {
    if (!activeRoleCode) return;
    setSaving(true);
    setMessage("");
    try {
      const chosen = templates.filter((template) => activeSelected.includes(template.code)).map((template, index) => ({
        moduleTemplateId: template._id,
        moduleType: template.types?.[0] || null,
        selectedSubtypes: Array.isArray(template.subtypes) ? template.subtypes : [],
        selectedSections: Array.isArray(template.sections) ? template.sections : [],
        sidebarLabel: template.name,
        sidebarPath: `/runtime-dashboard/${template.code}`,
        sidebarOrder: index + 1,
      }));
      await apiFetch(`/platform-admin/companies/${companyId}/dashboards/${activeRoleCode}/modules`, {
        method: "POST",
        body: { modules: chosen },
      });
      setMessage("Modules updated successfully.");
      onChanged?.();
    } catch (error) {
      setMessage(error?.message || "Failed to update role modules.");
    } finally {
      setSaving(false);
    }
  }

  if (!matrix.length) {
    return <div className="rounded-2xl border bg-white p-5 text-sm text-zinc-600">No dashboards exist yet. Generate dashboards first.</div>;
  }

  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="lg:w-72">
          <div className="text-sm font-semibold text-zinc-900">Roles</div>
          <div className="mt-3 space-y-2">
            {matrix.map((row) => (
              <button
                key={row.roleCode}
                type="button"
                onClick={() => setActiveRoleCode(row.roleCode)}
                className={`w-full rounded-xl border px-3 py-3 text-left ${activeRoleCode === row.roleCode ? "border-emerald-500 bg-emerald-50" : "bg-white hover:bg-zinc-50"}`}
              >
                <div className="font-medium text-zinc-900">{row.roleName}</div>
                <div className="mt-1 text-xs text-zinc-500">{(row.assignedModules || []).length} modules assigned</div>
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1">
          {activeRow ? (
            <>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold text-zinc-900">{activeRow.roleName}</div>
                  <div className="text-sm text-zinc-600">Select which module families should appear in this role’s runtime dashboard.</div>
                </div>
                <button onClick={saveRoleModules} disabled={saving} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                  {saving ? "Saving..." : "Save Modules"}
                </button>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {templates.map((template) => {
                  const checked = activeSelected.includes(template.code);
                  return (
                    <label key={template._id} className={`rounded-2xl border p-4 ${checked ? "border-emerald-400 bg-emerald-50" : "bg-white"}`}>
                      <div className="flex items-start gap-3">
                        <input type="checkbox" className="mt-1" checked={checked} onChange={() => toggle(template.code)} />
                        <div>
                          <div className="font-medium text-zinc-900">{template.name}</div>
                          <div className="mt-1 text-xs text-zinc-500">{template.code}</div>
                          <div className="mt-2 text-xs text-zinc-600">Sections: {(template.sections || []).join(", ") || "None"}</div>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
              {message ? <div className="mt-4 text-sm text-zinc-700">{message}</div> : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
