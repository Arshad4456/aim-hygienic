
"use client";

import Link from "next/link";

export default function DynamicDashboardShell({ dashboard, children }) {
  const company = dashboard?.company || {};
  const settings = dashboard?.settings || {};
  const role = dashboard?.role || {};
  const shell = dashboard?.shell || {};
  const sidebarItems = (shell.sidebarItems || []).filter((item) => item?.isActive !== false);
  const brandColor = company.primaryColor || "#059669";

  return (
    <div className="min-h-screen bg-zinc-50" style={{ "--brand": brandColor }}>
      <header className="border-b bg-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {company.logoUrl ? <img src={company.logoUrl} alt="Company" className="h-10 w-10 rounded-full object-cover" /> : <div className="h-10 w-10 rounded-full bg-emerald-100" />}
          <div>
            <div className="font-semibold">{settings.appName || company.name}</div>
            <div className="text-xs text-zinc-500">{role.roleName}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm">
          {shell.shellConfig?.hasNotifications ? <span className="rounded border px-2 py-1">Notifications</span> : null}
          {shell.shellConfig?.hasSettingsShortcut ? <span className="rounded border px-2 py-1">Settings</span> : null}
          {shell.shellConfig?.hasProfileMenu ? <span className="rounded border px-2 py-1">Profile</span> : null}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] min-h-[calc(100vh-65px)]">
        <aside className="border-r bg-white p-3">
          <div className="text-xs text-zinc-500 mb-3">Modules</div>
          <nav className="space-y-2">
            <Link href="/runtime-dashboard" className="block rounded-lg border px-3 py-2 text-sm hover:border-emerald-300">Dashboard Home</Link>
            {sidebarItems
              .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
              .map((item) => (
                <Link key={item.code} href={`/runtime-dashboard/${item.code}`} className="block rounded-lg border px-3 py-2 text-sm hover:border-emerald-300">
                  {item.label}
                </Link>
              ))}
          </nav>
        </aside>

        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
