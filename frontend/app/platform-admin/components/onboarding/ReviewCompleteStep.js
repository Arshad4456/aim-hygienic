"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../../../lib/api";

export default function ReviewCompleteStep({ companyId, onCompleted }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadSummary = useCallback(async () => {
    const data = await apiFetch(`/platform-admin/companies/${companyId}/onboarding-summary`);
    setSummary(data.summary || null);
  }, [companyId]);

  useEffect(() => {
    loadSummary().catch(() => undefined);
  }, [loadSummary]);

  async function complete() {
    setLoading(true);
    try {
      await apiFetch(`/platform-admin/companies/${companyId}/onboarding/complete`, { method: "POST", body: {} });
      onCompleted?.();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <OnboardingReview summary={summary} />
      <button disabled={loading} onClick={complete} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
        {loading ? "Completing..." : "Complete Company Setup"}
      </button>
    </div>
  );
}