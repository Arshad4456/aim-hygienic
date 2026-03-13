"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../../lib/api";

export default function DocumentTemplateStep({ companyId, onMarkedDone }) {
  const [presets, setPresets] = useState([]);
  const [invoicePresetId, setInvoicePresetId] = useState("");
  const [receiptPresetId, setReceiptPresetId] = useState("");

  useEffect(() => {
    apiFetch("/platform-admin/document-template-presets")
      .then((data) => setPresets(data.presets || []))
      .catch(() => undefined);
  }, []);

  const invoicePresets = useMemo(() => presets.filter((p) => p.documentType === "invoice"), [presets]);
  const receiptPresets = useMemo(() => presets.filter((p) => p.documentType === "receipt"), [presets]);

  async function apply() {
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
  }

  return (
    <div className="space-y-3">
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

      <button onClick={apply} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Apply Templates & Continue</button>
    </div>
  );
}