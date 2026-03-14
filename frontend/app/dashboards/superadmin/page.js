"use client";

import Link from "next/link";

const links = [
  { href: "/dashboards/superadmin/companies", title: "Companies", description: "Create, manage and review tenant companies and their setup progress." },
  { href: "/platform-admin/setup-templates", title: "Setup Templates", description: "Save, clone and apply reusable onboarding templates." },
  { href: "/dashboards/superadmin/runtime-preview", title: "Runtime Preview", description: "Preview any configured role dashboard without impersonating the user." },
  { href: "/platform-admin/plans", title: "Plans & Subscriptions", description: "Manage plans, subscriptions and lifecycle controls." },
  { href: "/platform-admin/analytics", title: "Platform Analytics", description: "Company usage, onboarding and plan health." },
  { href: "/platform-admin/audit-logs", title: "Audit Logs", description: "Track configuration changes and platform activity." },
  { href: "/platform-admin/companies", title: "Onboarding Wizard", description: "Start or resume company onboarding workflows." },
  { href: "/platform-admin/companies", title: "Config Snapshots", description: "Open a company and manage configuration snapshots from its workspace." },
];

export default function SuperAdminDashboardPage() {
  return (
    <div className="min-h-screen bg-zinc-50 p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <div className="text-xs uppercase tracking-wide text-emerald-700 font-semibold">Platform Management</div>
          <h1 className="text-3xl font-bold text-zinc-900 mt-2">Super Admin Dashboard</h1>
          <p className="text-zinc-600 mt-2">Configure companies, preview runtime dashboards, manage subscriptions, and monitor platform health without duplicating tenant business modules.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {links.map((link) => (
            <Link key={`${link.href}:${link.title}`} href={link.href} className="rounded-2xl border bg-white p-5 hover:border-emerald-300 hover:shadow-sm transition">
              <div className="font-semibold text-zinc-900">{link.title}</div>
              <div className="text-sm text-zinc-600 mt-2">{link.description}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
