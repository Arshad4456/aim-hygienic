"use client";

const STEP_META = [
  { index: 1, key: "companyCreated", label: "Create Company" },
  { index: 2, key: "settingsConfigured", label: "Company Settings" },
  { index: 3, key: "hierarchyAssigned", label: "Hierarchy" },
  { index: 4, key: "rolesAssigned", label: "Roles" },
  { index: 5, key: "dashboardsGenerated", label: "Dashboards" },
  { index: 6, key: "modulesAssigned", label: "Modules" },
  { index: 7, key: "permissionsConfigured", label: "Permissions" },
  { index: 8, key: "documentTemplatesConfigured", label: "Document Templates" },
  { index: 9, key: "setupCompleted", label: "Review & Complete" },
];

export default function OnboardingStepper({ onboardingState, currentStep, onStepChange }) {
  const steps = onboardingState?.steps || {};

  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="text-sm font-semibold mb-3">Onboarding Progress</div>
      <div className="space-y-2">
        {STEP_META.map((step) => {
          const done = Boolean(steps[step.key]);
          const active = Number(currentStep) === step.index;
          const disabled = step.index > Number(onboardingState?.currentStep || 1);

          return (
            <button
              key={step.key}
              disabled={disabled}
              onClick={() => onStepChange(step.index)}
              className={`w-full text-left rounded-lg border px-3 py-2 text-sm ${active ? "border-emerald-500 bg-emerald-50" : "border-zinc-200"} ${disabled ? "opacity-50 cursor-not-allowed" : "hover:border-emerald-300"}`}
            >
              <div className="flex items-center justify-between">
                <span>{step.index}. {step.label}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${done ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-600"}`}>{done ? "Done" : "Pending"}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
