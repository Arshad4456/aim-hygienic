"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { clearAuthStorage } from "../../../lib/clientAuth";
import { useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import { adminDashboardSearchItems } from "../../searchItems";

export default function AdminShell({ children, user, title = "Dashboard" }) {
  const router = useRouter();

  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("aim_sidebar_collapsed") === "1";
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const menuRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    localStorage.setItem("aim_sidebar_collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = `${title} | AIM Hygienic`;
    }
  }, [title]);

  useEffect(() => {
    function onDocClick(e) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setUserMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    function onDocClick(e) {
      if (!searchRef.current) return;
      if (!searchRef.current.contains(e.target)) setShowSearchDropdown(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    function onFullscreenChange() {
      if (typeof document === "undefined") return;
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") {
        setMobileOpen(false);
        setShowSearchDropdown(false);
      }
    }
    if (mobileOpen || showSearchDropdown) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen, showSearchDropdown]);

  function logout() {
    clearAuthStorage();
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

  const filteredSearchItems = useMemo(() => {
    const role = (user?.role || (typeof window !== "undefined" ? window.sessionStorage.getItem("aim_role") : "") || "").toString().trim().toLowerCase();
    const canAccessCompanyManagement = role === "admin" || role === "system admin";
    const roleItems = canAccessCompanyManagement
      ? adminDashboardSearchItems
      : adminDashboardSearchItems.filter((item) => !item.href.startsWith("/dashboards/admin/companies"));
    const value = searchTerm.trim().toLowerCase();
    if (!value) return roleItems;
    return roleItems.filter((item) => item.title.toLowerCase().includes(value));
  }, [searchTerm, user?.role]);

  async function toggleFullscreen() {
    if (typeof document === "undefined") return;
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (_e) {
      // ignore browser limitations
    }
  }

  function onSearchSelect(item) {
    setSearchTerm(item.title);
    setShowSearchDropdown(false);
    router.push(item.href);
  }

  return (
    <div className="h-screen bg-zinc-50 flex overflow-hidden">
      <div className="hidden md:flex h-screen">
        <Sidebar user={user} variant="desktop" collapsed={collapsed} />
      </div>

      {mobileOpen ? (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
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

      <div className="flex-1 h-screen flex flex-col overflow-hidden">
        <div className="shrink-0 border-b bg-white">
          <div className="px-4 md:px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="md:hidden rounded-xl border px-3 py-2 text-sm hover:bg-zinc-50"
              >
                ☰
              </button>

              <button
                type="button"
                onClick={() => setCollapsed((v) => !v)}
                className="hidden md:inline-flex rounded-xl px-3 py-2 text-sm hover:bg-zinc-50"
                title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                ☰
              </button>

              <div className="leading-tight">
                <div className="text-xs text-zinc-500">AIM Hygienic ERP</div>
                <div className="text-lg font-semibold text-zinc-900">{title}</div>
              </div>
            </div>

            <div className="flex w-full md:w-auto md:min-w-[620px] md:justify-end md:flex-nowrap items-center gap-3">
              <button
                type="button"
                onClick={toggleFullscreen}
                className="rounded-xl border px-3 py-2 text-sm hover:bg-zinc-50 whitespace-nowrap"
                title={isFullscreen ? "Exit full screen" : "Enter full screen"}
              >
                {isFullscreen ? "🗗" : "🗖"}
              </button>

              <div className="relative w-full md:flex-1 md:min-w-[280px] md:max-w-[300px]" ref={searchRef}>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => {
                    setSearchTerm(event.target.value);
                    setShowSearchDropdown(true);
                  }}
                  onFocus={() => setShowSearchDropdown(true)}
                  placeholder="Search this dashboard..."
                  className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />

                {showSearchDropdown ? (
                  <div className="absolute z-50 mt-1 w-full rounded-xl border bg-white shadow-lg max-h-72 overflow-y-auto">
                    {filteredSearchItems.length ? (
                      filteredSearchItems.map((item) => (
                        <button
                          key={item.href}
                          type="button"
                          onClick={() => onSearchSelect(item)}
                          className="w-full text-left px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
                        >
                          {item.title}
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-sm text-zinc-500">No results found.</div>
                    )}
                  </div>
                ) : null}
              </div>

              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="flex items-center gap-3 rounded-2xl hover:bg-zinc-50 px-2 py-1.5"
                >
                  <div className="text-right hidden sm:block leading-tight whitespace-nowrap">
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
        </div>

        <main className="flex-1 overflow-y-auto">
          <div className="px-4 md:px-6 py-5">{children}</div>
        </main>
      </div>
    </div>
  );
}
