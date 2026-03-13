"use client";

function Section({ title, children }) {
  return (
    <div className="rounded-xl border p-4 bg-zinc-50">
      <div className="font-semibold mb-2">{title}</div>
      {children}
    </div>
  );
}

export default function OnboardingReview({ summary }) {
  return (
    <div className="space-y-3">
      <Section title="Company">
        <div className="text-sm">{summary?.company?.name || "-"} ({summary?.company?.slug || "-"})</div>
      </Section>
      <Section title="Settings / Branding">
        <div className="text-sm">App Name: {summary?.settings?.appName || "-"}</div>
      </Section>
      <Section title="Hierarchy">
        <div className="text-sm">{summary?.hierarchy?.hierarchyName || "Not assigned"}</div>
      </Section>
      <Section title="Roles">
        <div className="text-sm">{(summary?.roles || []).map((role) => role.roleName).join(", ") || "None"}</div>
      </Section>
      <Section title="Dashboards">
        <div className="text-sm">{(summary?.dashboards || []).length} generated</div>
      </Section>
      <Section title="Modules">
        <div className="text-sm">{(summary?.modules || []).length} assigned</div>
      </Section>
      <Section title="Permissions">
        <div className="text-sm">{(summary?.permissions || []).length} configured</div>
      </Section>
      <Section title="Document Templates">
        <div className="text-sm">{(summary?.documents || []).length} templates</div>
      </Section>
    </div>
  );
}