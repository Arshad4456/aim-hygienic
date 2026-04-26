"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import PortalShell from "./PortalShell";
import useAuth from "../hooks/useAuth";
import useSidebar from "../hooks/useSidebar";
import { getPortalRoute } from "../config/portalRouteRegistry";
import { getWorkingPortalPath } from "../config/workingPortalRoutes";
import DynamicPortalHome from "../features/dashboard/pages/DynamicPortalHome";
import ModulePlaceholderPage from "../features/common/pages/ModulePlaceholderPage";
import RolesPage from "../features/roles/pages/RolesPage";
import UsersAccessPage from "../features/users/pages/UsersAccessPage";
import LiveTrackingModule from "../features/live-tracking/LiveTrackingModule";
import TerritoryArchitecturePage from "../features/territory/pages/TerritoryArchitecturePage";
import ProcurementFoundationPage from "../features/procurement/pages/ProcurementFoundationPage";
import InventoryWarehouseFoundationPage from "../features/inventory/pages/InventoryWarehouseFoundationPage";
import PrimarySalesFoundationPage from "../features/sales/pages/PrimarySalesFoundationPage";
import SecondarySalesFoundationPage from "../features/sales/pages/SecondarySalesFoundationPage";
import FinanceFoundationPage from "../features/finance/pages/FinanceFoundationPage";

const FOUNDATION_MODULES = ["dashboard", "roles", "users", "territory", "procurement", "purchase-orders", "supplier-payments", "goods-receipts", "inventory", "warehouse", "primary-sales-orders", "secondary-sales-orders", "finance", "payments", "receipts"];
function buildPath(slug = []) { const parts = Array.isArray(slug) ? slug.filter(Boolean) : []; return `/portals${parts.length ? `/${parts.join("/")}` : ""}`; }
function renderPortalContent(route, context) {
  if (route.moduleKey === "dashboard") return <DynamicPortalHome {...context} />;
  if (route.moduleKey === "roles") return <RolesPage />;
  if (route.moduleKey === "users") return <UsersAccessPage />;
  if (route.moduleKey === "territory") return <TerritoryArchitecturePage />;
  if (["procurement", "purchase-orders", "supplier-payments", "goods-receipts"].includes(route.moduleKey)) return <ProcurementFoundationPage mode={route.moduleKey} />;
  if (["inventory", "warehouse"].includes(route.moduleKey)) return <InventoryWarehouseFoundationPage mode={route.moduleKey} />;
  if (route.moduleKey === "primary-sales-orders") return <PrimarySalesFoundationPage />;
  if (route.moduleKey === "secondary-sales-orders") return <SecondarySalesFoundationPage />;
  if (["finance", "payments", "receipts"].includes(route.moduleKey)) return <FinanceFoundationPage mode={route.moduleKey} />;
  if (route.moduleKey === "live-tracking") return <LiveTrackingModule playbackBasePath="/portals/live-tracking/playback" />;
  return <ModulePlaceholderPage module={route.module} route={route} />;
}

export default function PortalRouteLoader({ slug = [] }) {
  const router = useRouter();
  const pathname = buildPath(slug);
  const route = getPortalRoute(pathname);
  const { user, visibleModules = [], loading, error } = useAuth();
  const menu = useSidebar(user, visibleModules);
  const workingPath = getWorkingPortalPath(route.moduleKey, user || {}, route.canonicalPath);
  useEffect(() => { if (!loading && workingPath && pathname !== workingPath && !FOUNDATION_MODULES.includes(route.moduleKey)) router.replace(workingPath); }, [loading, pathname, route.moduleKey, router, workingPath]);
  const subtitle = route.isLegacyAlias ? `Legacy portal path mapped to ${route.canonicalPath}. This module now belongs to Rawyan ERP permissions.` : route.module?.description;
  const shouldRedirect = !loading && workingPath && pathname !== workingPath && !FOUNDATION_MODULES.includes(route.moduleKey);
  return <PortalShell title={route.title} subtitle={subtitle} user={user} menu={menu}>{loading ? <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">Loading your portal permissions…</div> : null}{error ? <div className="mb-4 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">Could not load live permissions. Showing the safe default portal menu.</div> : null}{shouldRedirect ? <div className="rounded-3xl border border-cyan-200 bg-cyan-50 p-5 text-sm text-cyan-800">Opening the working Rawyan ERP module…</div> : renderPortalContent(route, { user, menu, visibleModules })}</PortalShell>;
}
