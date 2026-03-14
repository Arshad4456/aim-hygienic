"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../../lib/api";

export default function RoleSelectionStep({ companyId, onMarkedDone }) {
  const [templates, setTemplates] = useState([]);
  const [selectedCodes, setSelectedCodes] = useState([]);

  useEffect(() => {
    apiFetch(`/platform-admin/companies/${companyId}/available-role-templates`)
      .then((data) => setTemplates(data.templates || []))
      .catch(() => undefined);
  }, [companyId]);

  function toggle(code) {
    setSelectedCodes((prev) => (prev.includes(code) ? prev.filter((x) => x !== code) : [...prev, code]));
  }

  async function assign() {
    if (!selectedCodes.includes("company_admin")) {
      alert("company_admin role is required");
      return;
    }

    await apiFetch(`/platform-admin/companies/${companyId}/roles`, {
      method: "POST",
      body: { roleCodes: selectedCodes },
    });

    await apiFetch(`/platform-admin/companies/${companyId}/onboarding/step`, {
      method: "PUT",
      body: { stepKey: "rolesAssigned", currentStep: 5 },
    });
    onMarkedDone?.();
  }

  return (
    <div className="space-y-2">
      {templates.map((role) => (
        <label key={role._id} className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={selectedCodes.includes(role.code)} onChange={() => toggle(role.code)} />
          <span>{role.name} ({role.code})</span>
        </label>
      ))}
      <button onClick={assign} className="mt-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Assign Roles</button>
    </div>
  );
}