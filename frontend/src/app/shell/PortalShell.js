"use client";
import PortalHeader from "./PortalHeader";
import PortalSidebar from "./PortalSidebar";
import PortalMobileNav from "./PortalMobileNav";
import { BRAND_CONFIG } from "@/src/app/config/brand";
export default function PortalShell({ title = BRAND_CONFIG.name, subtitle, user, menu = [], actions, children }) {
  return <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50 text-slate-950"><div className="flex min-h-screen"><PortalSidebar menu={menu} user={user} /><main className="min-w-0 flex-1 pb-20 lg:pb-0"><PortalHeader user={user} title={title} subtitle={subtitle} actions={actions} /><section className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">{children}</section></main></div><PortalMobileNav items={menu} /></div>;
}
