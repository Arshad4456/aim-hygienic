"use client";
import PortalShell from "./PortalShell";
import useAuth from "../hooks/useAuth";
import useSidebar from "../hooks/useSidebar";
import { getPortalRoute } from "../config/portalRouteRegistry";
import DynamicPortalHome from "../features/dashboard/pages/DynamicPortalHome";
import ModulePlaceholderPage from "../features/common/pages/ModulePlaceholderPage";
import RolesPage from "../features/roles/pages/RolesPage";
import LiveTrackingModule from "../features/live-tracking/LiveTrackingModule";
function buildPath(slug = []) { const parts = Array.isArray(slug) ? slug.filter(Boolean) : []; return `/portals${parts.length ? `/${parts.join("/")}` : ""}`; }
function renderPortalContent(route, context) { if (route.moduleKey === "dashboard") return <DynamicPortalHome {...context} />; if (route.moduleKey === "roles") return <RolesPage />; if (route.moduleKey === "live-tracking") return <LiveTrackingModule playbackBasePath="/portals/live-tracking/playback" />; return <ModulePlaceholderPage module={route.module} route={route} />; }
export default function PortalRouteLoader({ slug = [] }) {
  const pathname = buildPath(slug);
  const route = getPortalRoute(pathname);
  const { user, visibleModules = [], loading, error } = useAuth();
  const menu = useSidebar(user, visibleModules);
  const subtitle = route.isLegacyAlias ? `Legacy portal path mapped to ${route.canonicalPath}. This module now belongs to the professional feature-based Rawyan ERP route system.` : route.module?.description;
  return <PortalShell title={route.title} subtitle={subtitle} user={user} menu={menu}>{loading ? <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">Loading your portal permissions…</div> : null}{error ? <div className="mb-4 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">Could not load live permissions. Showing the safe default portal menu.</div> : null}{renderPortalContent(route, { user, menu, visibleModules })}</PortalShell>;
}
