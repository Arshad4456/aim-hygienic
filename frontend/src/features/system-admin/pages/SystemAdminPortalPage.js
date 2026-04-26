"use client";

export default function SystemAdminPortalPage() {
  const modules = [
    ["Companies", "Create client companies, assign ERP template, set limits, and activate/suspend company."],
    ["ERP Templates", "Manage business models such as Distribution, Trading, Manufacturing, Retail, Service, and Custom ERP."],
    ["Subscriptions", "Plans, module limits, user limits, mobile access, storage, billing status, and expiry."],
    ["Global Modules", "Control which modules appear for each ERP template and client company."],
    ["System Audit", "Track login, role changes, data edits, approval actions, and sensitive changes."],
    ["Support", "Client support tickets, issue logs, onboarding tasks, and production alerts."],
  ];
  return <div className="space-y-6">
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.35em] text-emerald-600">System Admin / SaaS Owner</p>
      <h2 className="mt-2 text-3xl font-black text-slate-950">Rawyan ERP Control Center</h2>
      <p className="mt-2 max-w-4xl text-sm text-slate-600">This is the final concept for your freelancing/SaaS product: one system controls companies, ERP types, subscriptions, modules, and global support. Company users then work inside permission-based portals.</p>
    </div>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{modules.map(([title, description]) => <div key={title} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">SaaS</p><h3 className="mt-2 text-lg font-black text-slate-950">{title}</h3><p className="mt-2 text-sm text-slate-500">{description}</p></div>)}</div>
  </div>;
}
