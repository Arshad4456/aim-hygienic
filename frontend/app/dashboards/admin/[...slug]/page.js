"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import AdminShell from "../components/AdminShell";
import { RuntimeModuleRenderer } from "../../../runtime-dashboard/moduleRegistry";
import { getModuleMeta } from "../../../lib/platform/moduleCatalog";

const SEGMENT_TO_MODULE = {
  regions: "territory_assets", zones: "territory_assets", areas: "territory_assets", fields: "territory_assets", warehouses: "territory_assets", assets: "territory_assets", "vehicle-management": "vehicle_management", vehicles: "vehicle_management",
  users: "hr_role_management", hr: "hr_role_management",
  "order-management": "order_management", orders: "order_management", returns: "order_management",
  finance: "finance_accounts", receipts: "finance_accounts", invoices: "finance_accounts", aging: "finance_accounts", payments: "payment_management",
  expense: "expense_management",
  companies: "hr_role_management", messages: "hr_role_management", settings: "hr_role_management", reports: "finance_accounts",
};

function titleFromPath(pathname) {
  const parts = pathname.split("/").filter(Boolean);
  const idx = parts.indexOf("admin");
  const rest = idx >= 0 ? parts.slice(idx + 1) : parts;
  return rest.length ? rest.map((s) => s.replace(/-/g, " ")).map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(" / ") : "Module";
}

function inferModuleFromSlug(slug) {
  for (const seg of slug) {
    const code = SEGMENT_TO_MODULE[String(seg || "").toLowerCase()];
    if (code) return code;
  }
  return null;
}

export default function AdminDynamicModulePage() {
  const pathname = usePathname();
  const slug = useMemo(() => pathname.split("/").filter(Boolean).slice(2), [pathname]);
  const title = useMemo(() => titleFromPath(pathname), [pathname]);
  const inferredModuleCode = useMemo(() => inferModuleFromSlug(slug), [slug]);

  const moduleItem = useMemo(() => {
    if (!inferredModuleCode) return null;
    const meta = getModuleMeta(inferredModuleCode);
    return {
      moduleCode: inferredModuleCode,
      moduleName: meta.label,
      moduleType: 'legacy_runtime_bridge',
      selectedSubtypes: [],
      selectedSections: slug.filter((seg) => !['add','page'].includes(String(seg).toLowerCase())).map((seg) => String(seg).toLowerCase().replace(/-/g, '_')),
      allowedActions: ['read'],
      sectionPermissions: [],
    };
  }, [inferredModuleCode, slug]);

  return (
    <AdminShell title={title} user={null}>
      {moduleItem ? (
        <div className="space-y-4">
          <div className="rounded-xl border bg-amber-50 p-4 text-sm text-amber-800">
            This admin route is being rendered through the runtime module-family bridge to reduce hardcoded duplication.
          </div>
          <RuntimeModuleRenderer moduleItem={moduleItem} dashboard={null} />
        </div>
      ) : (
        <div className="rounded-2xl bg-white border shadow-sm p-5">
          <div className="text-xl font-semibold text-zinc-900">{title}</div>
          <div className="text-sm text-zinc-500 mt-2">This page is working via dynamic route.</div>
          <div className="mt-5 rounded-2xl border p-4">
            <div className="font-semibold text-zinc-900">Path</div>
            <div className="text-sm text-zinc-600 mt-1">{pathname}</div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
