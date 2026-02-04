"use client";

import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";

export default function AdminShell({ children, user, title = "Dashboard" }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close drawer on ESC
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    if (mobileOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar user={user} variant="desktop" />
        <main className="flex-1">
          {/* Desktop top */}
          <div className="sticky top-0 z-10 border-b bg-white">
            <div className="px-4 md:px-6 py-4 flex items-center justify-between">
              <div>
                <div className="text-xs text-zinc-500">AIM Hygienic ERP</div>
                <div className="text-lg font-semibold text-zinc-900">{title}</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right hidden lg:block">
                  <div className="text-sm font-medium text-zinc-900">{user?.fullName || "System Admin"}</div>
                  <div className="text-xs text-zinc-500">{user?.role || "admin"}</div>
                </div>
                <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <span className="text-emerald-700 font-bold">AH</span>
                </div>
              </div>
            </div>
          </div>

          <div className="px-4 md:px-6 py-5">{children}</div>
        </main>
      </div>

      {/* Mobile layout */}
      <div className="md:hidden">
        {/* Mobile topbar */}
        <div className="sticky top-0 z-20 border-b bg-white">
          <div className="px-4 py-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-xl border px-3 py-2 text-sm hover:bg-zinc-50"
            >
              ☰ Menu
            </button>

            <div className="text-center">
              <div className="text-[11px] text-zinc-500">AIM Hygienic ERP</div>
              <div className="text-sm font-semibold text-zinc-900">{title}</div>
            </div>

            <div className="h-9 w-9 rounded-full bg-emerald-100 flex items-center justify-center">
              <span className="text-emerald-700 font-bold">AH</span>
            </div>
          </div>
        </div>

        {/* Mobile drawer */}
        {mobileOpen ? (
          <div className="fixed inset-0 z-30">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setMobileOpen(false)}
            />
            <div className="absolute left-0 top-0 h-full w-[290px] bg-white shadow-xl">
              <Sidebar user={user} variant="mobile" onClose={() => setMobileOpen(false)} />
            </div>
          </div>
        ) : null}

        <main className="px-4 py-5">{children}</main>
      </div>
    </div>
  );
}
