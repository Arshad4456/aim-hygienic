"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "../../../../lib/api";
import OnboardingLayout from "../../../components/OnboardingLayout";
import OnboardingStepper from "../../../components/OnboardingStepper";
import CompanyCreateStep from "../../../components/onboarding/CompanyCreateStep";
import CompanySettingsStep from "../../../components/onboarding/CompanySettingsStep";
import HierarchySelectionStep from "../../../components/onboarding/HierarchySelectionStep";
import RoleSelectionStep from "../../../components/onboarding/RoleSelectionStep";
import DashboardGenerationStep from "../../../components/onboarding/DashboardGenerationStep";
import ModuleAssignmentStep from "../../../components/onboarding/ModuleAssignmentStep";
import PermissionConfigurationStep from "../../../components/onboarding/PermissionConfigurationStep";
import DocumentTemplateStep from "../../../components/onboarding/DocumentTemplateStep";
import ReviewCompleteStep from "../../../components/onboarding/ReviewCompleteStep";

const STEP_TITLES = {
  1: "Step 1: Create Company",
  2: "Step 2: Configure Company Settings / Branding",
  3: "Step 3: Select Hierarchy Template",
  4: "Step 4: Select Role Templates",
  5: "Step 5: Generate Dashboards",
  6: "Step 6: Assign Modules",
  7: "Step 7: Configure Role Module Permissions",
  8: "Step 8: Configure Document Templates",
  9: "Step 9: Review & Complete",
};

export default function CompanyOnboardingWizardPage() {
  const { companyId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [state, setState] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);

  const loadState = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch(`/platform-admin/companies/${companyId}/onboarding`);
      setState(data.onboardingState || null);
      setCurrentStep(Number(data.onboardingState?.currentStep || 1));
    } catch (e) {
      setError(e.message || "Onboarding not started");
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;
    loadState().catch(() => undefined);
  }, [companyId, loadState]);

  async function startOnboarding() {
    const data = await apiFetch(`/platform-admin/companies/${companyId}/onboarding/start`, { method: "POST", body: {} });
    setState(data.onboardingState || null);
    setCurrentStep(1);
    setError("");
  }

  const activeStep = useMemo(() => {
    switch (currentStep) {
      case 1:
        return <CompanyCreateStep companyId={companyId} onMarkedDone={loadState} />;
      case 2:
        return <CompanySettingsStep companyId={companyId} onMarkedDone={loadState} />;
      case 3:
        return <HierarchySelectionStep companyId={companyId} onMarkedDone={loadState} />;
      case 4:
        return <RoleSelectionStep companyId={companyId} onMarkedDone={loadState} />;
      case 5:
        return <DashboardGenerationStep companyId={companyId} onMarkedDone={loadState} />;
      case 6:
        return <ModuleAssignmentStep companyId={companyId} onMarkedDone={loadState} />;
      case 7:
        return <PermissionConfigurationStep companyId={companyId} onMarkedDone={loadState} />;
      case 8:
        return <DocumentTemplateStep companyId={companyId} onMarkedDone={loadState} />;
      case 9:
      default:
        return <ReviewCompleteStep companyId={companyId} onCompleted={loadState} />;
    }
  }, [companyId, currentStep, loadState]);

  if (loading) return <div className="p-6 text-sm">Loading onboarding wizard...</div>;

  if (!state) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="rounded-xl border bg-white p-6 max-w-lg">
          <div className="font-semibold">Company Onboarding Wizard</div>
          <p className="text-sm text-zinc-600 mt-2">{error || "Start guided onboarding for this company."}</p>
          <button onClick={startOnboarding} className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Start Onboarding</button>
        </div>
      </div>
    );
  }

  return (
    <OnboardingLayout
      title={STEP_TITLES[currentStep] || "Company Onboarding"}
      subtitle="Complete required setup in sequence. Progress is saved per company and can be resumed anytime."
      stepper={<OnboardingStepper onboardingState={state} currentStep={currentStep} onStepChange={setCurrentStep} />}
    >
      {activeStep}
    </OnboardingLayout>
  );
}