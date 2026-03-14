"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../lib/api";

export default function DocumentTemplateStep({ companyId, onMarkedDone }) {
  const [presets, setPresets] = useState([]);
  const [invoicePresetId, setInvoicePresetId] = useState("");
  const [receiptPresetId, setReceiptPresetId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch("/platform-admin/document-template-presets")
      .then((data) => setPresets(data.presets || []))
      .catch((err) => setError(err.message || "Failed to load document presets"));
  }, []);

  const invoicePresets = useMemo(() => presets.filter((p) => p.documentType === "invoice"), [presets]);
  const receiptPresets = useMemo(() => presets.filter((p) => p.documentType === "receipt"), [presets]);

  async function apply() {
    setSaving(true);
    setError("");
    try {
      if (invoicePresetId) {
        await apiFetch(`/platform-admin/companies/${companyId}/document-templates/apply-preset`, {
          method: "POST",
          body: { presetId: invoicePresetId, isDefault: true },
        });
      }
      if (receiptPresetId) {
        await apiFetch(`/platform-admin/companies/${companyId}/document-templates/apply-preset`, {
          method: "POST",
          body: { presetId: receiptPresetId, isDefault: true },
        });
      }
      await apiFetch(`/platform-admin/companies/${companyId}/onboarding/step`, {
        method: "PUT",
        body: { stepKey: "documentTemplatesConfigured", currentStep: 9 },
      });
      onMarkedDone?.();
    } catch (err) {
      setError(err.message || "Failed to apply document templates");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-zinc-600">Choose the default invoice and receipt presets for this company. These will be used in runtime rendering and previews.</div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <div className="text-sm font-medium mb-1">Default Invoice Template</div>
          <select value={invoicePresetId} onChange={(e) => setInvoicePresetId(e.target.value)} className="w-full rounded-lg border px-3 py-2">
            <option value="">Select invoice preset</option>
            {invoicePresets.map((p) => <option key={p._id} value={p._id}>{p.templateName} ({p.templateCode})</option>)}
          </select>
        </div>
        <div>
          <div className="text-sm font-medium mb-1">Default Receipt Template</div>
          <select value={receiptPresetId} onChange={(e) => setReceiptPresetId(e.target.value)} className="w-full rounded-lg border px-3 py-2">
            <option value="">Select receipt preset</option>
            {receiptPresets.map((p) => <option key={p._id} value={p._id}>{p.templateName} ({p.templateCode})</option>)}
          </select>
        </div>
      </div>
      {error ? <div className="text-sm text-red-600">{error}</div> : null}
      <button disabled={saving} onClick={apply} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Applying..." : "Apply Templates & Continue"}</button>
    </div>
  );
}
