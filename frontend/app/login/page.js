"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../lib/api";
import { getAuthItem, setAuthSession } from "../lib/clientAuth";

function roleRedirect(role, isSuperAdmin = false) {
  const normalized = String(role || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  if (isSuperAdmin || normalized === "super_admin" || normalized === "superadmin") return "/dashboards/superadmin";
  const map = {
    admin: "/dashboards/admin",
    ceo: "/dashboards/ceo",
    managing_director: "/dashboards/manageDirector",
    warehouse_manager: "/dashboards/warehouseManager",
    account_officer: "/dashboards/accountOfficer",
    hr_assistant: "/dashboards/hrAssistant",
    cashier: "/dashboards/cashier",
    kpo: "/dashboards/kpo",
    brand_manager: "/dashboards/brandManager",
    national_sale_manager: "/dashboards/nationalSM",
    regional_sale_manager: "/dashboards/regionalSM",
    zone_sale_manager: "/dashboards/zoneSM",
    territory_sale_manager: "/dashboards/territorySM",
    distributor: "/dashboards/distributor",
    field_sale_manager: "/dashboards/fieldSM",
    order_booker: "/dashboards/orderBooker",
    salesman: "/dashboards/salesman",
    delivery_boy: "/dashboards/deliveryBoy",
    customer: "/dashboards/customer",
  };
  return map[normalized] || "/runtime-dashboard";
}

export default function LoginPage() {
  const router = useRouter();
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = typeof window !== "undefined" ? getAuthItem("aim_token") : null;
    const role = typeof window !== "undefined" ? getAuthItem("aim_role") : null;
    const userRaw = typeof window !== "undefined" ? getAuthItem("aim_user") : null;
    let isSuperAdmin = false;
    try {
      const user = userRaw ? JSON.parse(userRaw) : null;
      isSuperAdmin = Boolean(user?.isSuperAdmin);
    } catch {}
    if (token && role) {
      router.replace(roleRedirect(role, isSuperAdmin));
    }
  }, [router]);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await apiFetch("/auth/login", {
        method: "POST",
        credentials: "include",
        body: { mobile: mobile.trim(), password },
      });

      const effectiveRole = data.user?.roleCode || data.user?.role || "";
      setAuthSession({ token: data.token, role: effectiveRole, user: data.user || {} });
      document.cookie = `aim_token=${data.token}; path=/; Secure; SameSite=Lax`;
      document.cookie = `aim_role=${effectiveRole}; path=/; Secure; SameSite=Lax`;

      router.replace(roleRedirect(effectiveRole, Boolean(data.user?.isSuperAdmin)));
    } catch (err) {
      setError(err.message || "Failed to login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-sm border p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
            <span className="text-emerald-700 font-bold">AH</span>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-zinc-900">AIM Hygienic ERP</h1>
            <p className="text-sm text-zinc-500">Login to continue</p>
          </div>
        </div>

        {error ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-zinc-700">Mobile Number</label>
            <input className="mt-1 w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-200" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="03xx-xxxxxxx" autoComplete="tel" />
          </div>

          <div>
            <label className="text-sm text-zinc-700">Password</label>
            <div className="relative">
              <input className="mt-1 w-full rounded-xl border px-3 py-2 pr-11 outline-none focus:ring-2 focus:ring-emerald-200" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter Your Password" type={showPassword ? "text" : "password"} autoComplete="current-password" />
              <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-zinc-700">
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <button disabled={loading} className="w-full rounded-xl bg-emerald-600 text-white py-2.5 font-medium hover:bg-emerald-700 disabled:opacity-60">
            {loading ? "Signing in..." : "Login"}
          </button>

          <div className="text-xs text-zinc-500 text-center">Admin or platform super admin creates users and assigns roles.</div>
        </form>
      </div>
    </div>
  );
}
