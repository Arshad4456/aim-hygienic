"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../../lib/api";

export default function DashboardGenerationStep({ companyId, onMarkedDone }) {
  const [roles, setRoles] = useState([]);
  const [selectedRoleCodes, setSelectedRoleCodes] = useState([]);

  useEffect(() => {
    apiFetch(`/platform-admin/companies/${companyId}/roles`)
      .then((data) => {
        const items = data.roles || [];
        setRoles(items);
        setSelectedRoleCodes(items.map((r) => r.roleCode));
      })
      .catch(() => undefined);
  }, [companyId]);

  async function generateDashboards() {
    await apiFetch(`/platform-admin/companies/${companyId}/generate-dashboards`, {
      method: "POST",
      body: { roleCodes: selectedRoleCodes },
    });

    await apiFetch(`/platform-admin/companies/${companyId}/onboarding/step`, {
      method: "PUT",
      body: { stepKey: "dashboardsGenerated", currentStep: 6 },
    });
    onMarkedDone?.();
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-zinc-700">Selected roles for dashboard generation: {selectedRoleCodes.join(", ") || "-"}</div>
      <button onClick={generateDashboards} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Generate Dashboards</button>
      <div className="text-xs text-zinc-500">Roles available: {roles.map((r) => r.roleCode).join(", ")}</div>
    </div>
  );
}