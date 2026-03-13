"use client";

const ITEMS = [
  ["Total Companies", "totalCompanies"],
  ["Active Companies", "activeCompanies"],
  ["Trial Companies", "trialCompanies"],
  ["Suspended Companies", "suspendedCompanies"],
  ["Expired Companies", "expiredCompanies"],
  ["Completed Onboarding", "completedOnboardingCompanies"],
  ["Total Users", "totalUsersAcrossPlatform"],
  ["Total Orders", "totalOrdersAcrossPlatform"],
];

export default function PlatformSummaryCards({ overview }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {ITEMS.map(([label, key]) => (
        <div key={key} className="rounded-xl border bg-white p-4">
          <div className="text-xs text-zinc-500">{label}</div>
          <div className="text-2xl font-semibold mt-1">{Number(overview?.[key] || 0)}</div>
        </div>
      ))}
    </div>
  );
}