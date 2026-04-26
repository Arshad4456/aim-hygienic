"use client";

export default function SettingsPortalPage() {
  const cards = [
    ["Company Settings", "Branding, fiscal year, tax/currency defaults, document prefixes, and branch defaults."],
    ["Portal Settings", "Default landing page, sidebar modules, role badges, and mobile access rules."],
    ["Security", "Password policy, session control, device history, and audit requirements."],
    ["Integrations", "SMS gateway, WhatsApp provider, email sender, payment gateway, maps, and backup settings."],
    ["Data Cleanup", "Legacy route cleanup, old dashboards redirect, and module migration reports."],
    ["Production", "Nginx/API base, environment variables, build verification, and deployment checks."],
  ];
  return <div className="space-y-6">
    <div className="rounded-[2rem] bg-gradient-to-r from-slate-950 via-emerald-700 to-cyan-500 p-6 text-white shadow-lg">
      <p className="text-xs font-black uppercase tracking-[0.35em] text-cyan-100">Phase 11 Portal Conversion</p>
      <h2 className="mt-2 text-3xl font-black">Settings Center</h2>
      <p className="mt-2 max-w-4xl text-sm text-cyan-50">Central place for company, portal, security, integration, and production settings. Detailed settings forms will be expanded in the next enterprise phases.</p>
    </div>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{cards.map(([title, description]) => <div key={title} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Settings</p><h3 className="mt-2 text-lg font-black text-slate-950">{title}</h3><p className="mt-2 text-sm text-slate-500">{description}</p></div>)}</div>
  </div>;
}
