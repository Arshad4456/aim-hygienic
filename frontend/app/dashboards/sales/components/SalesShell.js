"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import SalesSidebar from "./SalesSidebar";

export default function SalesShell({ children, user, title = "Sales Dashboard" }) {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function onDocClick(event) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target)) setUserMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    function onKey(event) {
      if (event.key === "Escape") setMobileOpen(false);
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
    const name = user?.fullName || "Sales Manager";
    const parts = name.split(" ").filter(Boolean);
    const a = parts[0]?.[0] || "S";
    const b = parts[1]?.[0] || "M";
    return (a + b).toUpperCase();
  }, [user]);

  return (
    <div className="h-screen bg-zinc-50 flex overflow-hidden">
      <div className="hidden md:flex h-screen">
        <SalesSidebar user={user} variant="desktop" />
      </div>

      {mobileOpen ? (
        <div className="md:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-[260px] bg-white shadow-xl">
            <SalesSidebar user={user} variant="mobile" onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="flex-1 h-screen flex flex-col overflow-hidden">
        <div className="shrink-0 border-b bg-white">
          <div className="px-4 md:px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="md:hidden rounded-xl border px-3 py-2 text-sm hover:bg-zinc-50"
              >
                ☰
              </button>
              <div className="leading-tight">
                <div className="text-xs text-zinc-500">Sales Manager</div>
                <div className="text-lg font-semibold text-zinc-900">{title}</div>
              </div>
            </div>

            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex items-center gap-3 rounded-2xl hover:bg-zinc-50 px-2 py-1.5"
              >
                <div className="text-right hidden sm:block leading-tight">
                  <div className="text-sm font-medium text-zinc-900">
                    {user?.fullName || "Sales Manager"}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {user?.companyName || "Company"} • {user?.role || "Sales Manager"}
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
                      {user?.fullName || "Sales Manager"}
                    </div>
                    <div className="text-xs text-zinc-500">{user?.username || "sales"}</div>
                  </div>
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

        <main className="flex-1 overflow-y-auto">
          <div className="px-4 md:px-6 py-5">{children}</div>
        </main>
      </div>
    </div>
  );
}
