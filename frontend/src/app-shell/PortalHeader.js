"use client";
import { BRAND_CONFIG } from "@/src/config/brand";
import AccountDropdown from "./AccountDropdown";

export default function PortalHeader({ user, title = BRAND_CONFIG.name, subtitle, actions }) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-600">{BRAND_CONFIG.name}</p>
          <h1 className="truncate text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{title}</h1>
          {subtitle ? <p className="mt-1 max-w-2xl text-sm text-slate-500">{subtitle}</p> : null}
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
            <span className="rounded-full bg-slate-100 px-3 py-1">{user?.companyName || "System Portal"}</span>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">{user?.roleName || user?.role || user?.portalType || "ERP User"}</span>
            {user?.erpTemplateKey ? <span className="rounded-full bg-cyan-50 px-3 py-1 text-cyan-700">{user.erpTemplateKey}</span> : null}
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
          <AccountDropdown user={user} />
        </div>
      </div>
    </header>
  );
}
