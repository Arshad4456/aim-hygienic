"use client";

export default function OnboardingFunnelCard({ onboarding }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="font-semibold mb-3">Onboarding Funnel</div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between"><span>Total</span><span>{Number(onboarding?.totalCompanies || 0)}</span></div>
        <div className="flex justify-between"><span>Started</span><span>{Number(onboarding?.started || 0)}</span></div>
        <div className="flex justify-between"><span>Completed</span><span>{Number(onboarding?.completed || 0)}</span></div>
        <div className="flex justify-between"><span>Incomplete</span><span>{Number(onboarding?.incomplete || 0)}</span></div>
      </div>
    </div>
  );
}