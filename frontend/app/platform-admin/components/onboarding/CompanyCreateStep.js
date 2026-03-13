"use client";

import { apiFetch } from "../../../lib/api";

export default function CompanyCreateStep({ companyId, onMarkedDone }) {
  async function markComplete() {
    await apiFetch(`/platform-admin/companies/${companyId}/onboarding/step`, {
      method: "PUT",
      body: { stepKey: "companyCreated", currentStep: 2 },
    });
    onMarkedDone?.();
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-700">Company is already created. Confirm this step to continue onboarding.</p>
      <button onClick={markComplete} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Confirm Company Created</button>
    </div>
  );
}
