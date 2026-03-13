"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../../lib/api";

export default function CompanySettingsStep({ companyId, onMarkedDone }) {
  const [form, setForm] = useState({
    appName: "",
    logoUrl: "",
    primaryColor: "",
    invoiceHeader: "",
    invoiceFooter: "",
    receiptHeader: "",
    receiptFooter: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch(`/platform-admin/companies/${companyId}/settings`)
      .then((data) => setForm((prev) => ({ ...prev, ...(data.settings || {}) })))
      .catch(() => undefined);
  }, [companyId]);

  async function save() {
    setSaving(true);
    try {
      await apiFetch(`/platform-admin/companies/${companyId}/settings`, { method: "PUT", body: form });
      await apiFetch(`/platform-admin/companies/${companyId}/onboarding/step`, {
        method: "PUT",
        body: { stepKey: "settingsConfigured", currentStep: 3 },
      });
      onMarkedDone?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      {Object.keys(form).map((key) => (
        <label key={key} className="block text-sm">
          <div className="mb-1 font-medium text-zinc-700">{key}</div>
          <input value={form[key] || ""} onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))} className="w-full rounded-lg border px-3 py-2" />
        </label>
      ))}
      <button disabled={saving} onClick={save} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">{saving ? "Saving..." : "Save & Continue"}</button>
    </div>
  );
}