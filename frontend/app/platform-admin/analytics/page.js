"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "../../lib/api";
import PlatformSummaryCards from "../components/PlatformSummaryCards";
import CompanyUsageTable from "../components/CompanyUsageTable";
import ModuleAdoptionChart from "../components/ModuleAdoptionChart";
import OnboardingFunnelCard from "../components/OnboardingFunnelCard";

export default function PlatformAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [overview, setOverview] = useState({});
  const [companies, setCompanies] = useState([]);
  const [moduleAdoption, setModuleAdoption] = useState([]);
  const [onboarding, setOnboarding] = useState({});

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [overviewRes, companiesRes, adoptionRes, onboardingRes] = await Promise.all([
          apiFetch("/platform-admin/analytics/overview"),
          apiFetch("/platform-admin/analytics/companies"),
          apiFetch("/platform-admin/analytics/module-adoption"),
          apiFetch("/platform-admin/analytics/onboarding-status"),
        ]);

        if (!mounted) return;
        setOverview(overviewRes?.overview || {});
        setCompanies(companiesRes?.companies || []);
        setModuleAdoption(adoptionRes?.moduleAdoption || []);
        setOnboarding(onboardingRes?.onboarding || {});
      } catch (err) {
        if (!mounted) return;
        setError(err?.message || "Failed to load platform analytics");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return <div className="p-6 text-sm">Loading platform analytics...</div>;

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-xl border bg-white p-4">
          <div className="font-semibold">Failed to load analytics</div>
          <div className="text-sm text-zinc-600 mt-1">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Platform Analytics</h1>
        <p className="text-sm text-zinc-600">Super-admin visibility into tenant usage, adoption, and plan limits.</p>
      </div>

      <PlatformSummaryCards overview={overview} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <ModuleAdoptionChart rows={moduleAdoption} />
        </div>
        <OnboardingFunnelCard onboarding={onboarding} />
      </div>

      <CompanyUsageTable companies={companies} />
    </div>
  );
}
