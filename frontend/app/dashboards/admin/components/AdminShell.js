"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "./Sidebar";

export default function AdminShell({ children, user, title = "Dashboard" }) {
  const router = useRouter();

  // Desktop collapse state
  const [collapsed, setCollapsed] = useState(false);

  // Mobile drawer state
  const [mobileOpen, setMobileOpen] = useState(false);

  // Topbar user menu
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Persist collapsed state (optional but nice)
  useEffect(() => {
    const v = localStorage.getItem("aim_sidebar_collapsed");
    if (v === "1") setCollapsed(true);
  }, []);
  useEffect(() => {
    localStorage.setItem("aim_sidebar_collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function onDocClick(e) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setUserMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Close mobile drawer on ESC
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    if (mobileOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  function logout() {
    localStorage.removeItem("aim_token");
    localStorage.removeItem("aim_role");
    localStorage.removeItem("aim_user");
    document.cookie = "aim_token=; Max-Age=0; path=/";
    document.cookie = "aim_role=; Max-Age=0; path=/";
    setUserMenuOpen(false);
    setMobileOpen(false);
    router.push("/login");
  }

  const initials = useMemo(() => {
    const name = user?.fullName || "Admin";
    const parts = name.split(" ").filter(Boolean);
    const a = parts[0]?.[0] || "A";
    const b = parts[1]?.[0] || "H";
    return (a + b).toUpperCase();
  }, [user]);

  return (
    <div className="h-screen bg-zinc-50 flex overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex h-screen">
        <Sidebar
          user={user}
          variant="desktop"
          collapsed={collapsed}
        />
      </div>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="md:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-[290px] bg-white shadow-xl">
            <Sidebar
              user={user}
              variant="mobile"
              collapsed={false}
              onClose={() => setMobileOpen(false)}
            />
          </div>
        </div>
      ) : null}

      {/* Main column */}
      <div className="flex-1 h-screen flex flex-col overflow-hidden">
        {/* Topbar */}
        <div className="shrink-0 border-b bg-white">
          <div className="px-4 md:px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Mobile menu */}
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="md:hidden rounded-xl border px-3 py-2 text-sm hover:bg-zinc-50"
              >
                ☰
              </button>

              {/* Desktop collapse toggle */}
              <button
                type="button"
                onClick={() => setCollapsed((v) => !v)}
                className="hidden md:inline-flex rounded-xl border px-3 py-2 text-sm hover:bg-zinc-50"
                title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                ☰
              </button>

              <div className="leading-tight">
                <div className="text-xs text-zinc-500">AIM Hygienic ERP</div>
                <div className="text-lg font-semibold text-zinc-900">{title}</div>
              </div>
            </div>

            {/* User menu (click logo/avatar) */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex items-center gap-3 rounded-2xl hover:bg-zinc-50 px-2 py-1.5"
              >
                <div className="text-right hidden sm:block leading-tight">
                  <div className="text-sm font-medium text-zinc-900">
                    {user?.fullName || "System Admin"}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {user?.role || "admin"} • {user?.company || "AIM Hygienic"}
                  </div>
                </div>
                <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <span className="text-emerald-700 font-bold">{initials}</span>
                </div>
              </button>

              {userMenuOpen ? (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl border bg-white shadow-lg p-2 z-50">
                  <div className="px-3 py-2">
                    <div className="text-sm font-semibold text-zinc-900">
                      {user?.fullName || "System Admin"}
                    </div>
                    <div className="text-xs text-zinc-500">{user?.username || "admin"}</div>
                  </div>

                  <div className="h-px bg-zinc-100 my-1" />

                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      router.push("/dashboards/admin/settings");
                    }}
                    className="w-full text-left rounded-xl px-3 py-2 text-sm hover:bg-zinc-50"
                  >
                    Account Settings
                  </button>

                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      router.push("/dashboards/admin/settings/change-password");
                    }}
                    className="w-full text-left rounded-xl px-3 py-2 text-sm hover:bg-zinc-50"
                  >
                    Change Password
                  </button>

                  <div className="h-px bg-zinc-100 my-1" />

                  <button
                    onClick={logout}
                    className="w-full text-left rounded-xl px-3 py-2 text-sm hover:bg-zinc-50 text-red-600"
                  >
                    Logout
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Main content scrolls independently */}
        <main className="flex-1 overflow-y-auto">
          <div className="px-4 md:px-6 py-5">{children}</div>
        </main>
      </div>
    </div>
  );
}
