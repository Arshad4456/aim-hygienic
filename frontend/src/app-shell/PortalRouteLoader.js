"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import PortalShell from "./PortalShell";
import useAuth from "../hooks/useAuth";
import useSidebar from "../hooks/useSidebar";
import { getPortalRoute } from "../config/portalRouteRegistry";
import { getRolePortalProfile, getDefaultPathForUser, isPathAllowedForUser } from "../config/erpAccessMatrix";
import DynamicPortalHome from "../features/dashboard/pages/DynamicPortalHome";
import ModulePlaceholderPage from "../features/common/pages/ModulePlaceholderPage";
import RolesPage from "../features/roles/pages/RolesPage";
import UsersAccessPage from "../features/users/pages/UsersAccessPage";
import TerritoryArchitecturePage from "../features/territory/pages/TerritoryArchitecturePage";
import ProcurementFoundationPage from "../features/procurement/pages/ProcurementFoundationPage";
import InventoryWarehouseFoundationPage from "../features/inventory/pages/InventoryWarehouseFoundationPage";
import PrimarySalesFoundationPage from "../features/sales/pages/PrimarySalesFoundationPage";
import SecondarySalesFoundationPage from "../features/sales/pages/SecondarySalesFoundationPage";
import FinanceFoundationPage from "../features/finance/pages/FinanceFoundationPage";
import LogisticsFleetTrackingPage from "../features/logistics/pages/LogisticsFleetTrackingPage";
import OperationsControlCenterPage from "../features/operations/pages/OperationsControlCenterPage";
import CustomerBillingPortalPage from "../features/customers/pages/CustomerBillingPortalPage";
import ReportsAutomationPage from "../features/reports/pages/ReportsAutomationPage";
import CompaniesPortalPage from "../features/companies/pages/CompaniesPortalPage";
import ErpTemplatesPortalPage from "../features/erp-templates/pages/ErpTemplatesPortalPage";
import ProductsPortalPage from "../features/products/pages/ProductsPortalPage";
import CustomersPortalPage from "../features/customers/pages/CustomersPortalPage";
import ExpensesPortalPage from "../features/expenses/pages/ExpensesPortalPage";
import LoansPortalPage from "../features/loans/pages/LoansPortalPage";
import ReturnsPortalPage from "../features/returns/pages/ReturnsPortalPage";
import NotificationCenterPage from "../features/notifications/pages/NotificationCenterPage";
import SettingsPortalPage from "../features/settings/pages/SettingsPortalPage";
import SystemAdminPortalPage from "../features/system-admin/pages/SystemAdminPortalPage";
import SystemAdminUsersPage from "../features/system-admin/pages/SystemAdminUsersPage";
import MasterDataCrudPage from "../features/master-data/pages/MasterDataCrudPage";
import RetailPosPortalPage from "../features/retail-pos/pages/RetailPosPortalPage";
import ManufacturingPortalPage from "../features/manufacturing/pages/ManufacturingPortalPage";
import ServicePortalPage from "../features/service/pages/ServicePortalPage";
import TradingPortalPage from "../features/trading/pages/TradingPortalPage";

function buildPath(slug = []) {
  const parts = Array.isArray(slug) ? slug.filter(Boolean) : [];
  return `/portals${parts.length ? `/${parts.join("/")}` : ""}`;
}

function AccessDenied({ route, profile, safePath }) {
  return <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 text-amber-900 shadow-sm">
    <p className="text-xs font-black uppercase tracking-[0.3em] text-amber-600">Portal access corrected</p>
    <h2 className="mt-3 text-2xl font-black">This module is not available for your role, plan, or ERP type.</h2>
    <p className="mt-2 text-sm leading-6">Rawyan ERP now builds access from one ERP matrix: company ERP type, active plan, enabled modules, role permissions, and your assigned data scope.</p>
    <p className="mt-3 text-xs font-bold text-amber-700">Requested route: {route.canonicalPath}</p>
    <a href={safePath} className="mt-5 inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white">Open my correct portal</a>
  </div>;
}

function renderPortalContent(route, context) {
  if (route.moduleKey === "dashboard") return <DynamicPortalHome {...context} />;
  if (route.moduleKey === "system-admin-users") return <SystemAdminUsersPage />;
  if (["system-admin", "system-admin-companies", "subscription-plans", "module-controls"].includes(route.moduleKey)) return <SystemAdminPortalPage mode={route.moduleKey} />;
  if (route.moduleKey === "companies") return <CompaniesPortalPage />;
  if (route.moduleKey === "erp-templates") return <ErpTemplatesPortalPage />;
  if (route.moduleKey === "roles") return <RolesPage />;
  if (route.moduleKey === "users") return <UsersAccessPage />;
  if (route.moduleKey === "territory") return <TerritoryArchitecturePage />;
  if (["suppliers", "warehouses", "regions", "zones", "areas", "fields"].includes(route.moduleKey)) return <MasterDataCrudPage resourceKey={route.moduleKey} />;
  if (route.moduleKey === "products") return <ProductsPortalPage />;
  if (["procurement", "purchase-requests", "purchase-orders", "supplier-payments", "goods-receipts"].includes(route.moduleKey)) return <ProcurementFoundationPage mode={route.moduleKey} />;
  if (["inventory", "warehouse"].includes(route.moduleKey)) return <InventoryWarehouseFoundationPage mode={route.moduleKey} />;
  if (["sales-quotations", "primary-sales-orders"].includes(route.moduleKey)) return <PrimarySalesFoundationPage mode={route.moduleKey} />;
  if (route.moduleKey === "secondary-sales-orders") return <SecondarySalesFoundationPage />;
  if (route.moduleKey === "customers") return <CustomersPortalPage />;
  if (route.moduleKey === "customer-orders" || route.moduleKey === "customer-billing") return <CustomerBillingPortalPage />;
  if (["finance", "payments", "receipts"].includes(route.moduleKey)) return <FinanceFoundationPage mode={route.moduleKey} />;
  if (route.moduleKey === "expenses") return <ExpensesPortalPage />;
  if (route.moduleKey === "loans") return <LoansPortalPage />;
  if (route.moduleKey === "returns") return <ReturnsPortalPage />;
  if (["fleet", "dispatches", "deliveries"].includes(route.moduleKey)) return <LogisticsFleetTrackingPage mode={route.moduleKey} />;
  if (route.moduleKey === "live-tracking") return <LogisticsFleetTrackingPage mode="live-tracking" />;
  if (route.moduleKey === "operations") return <OperationsControlCenterPage />;
  if (route.moduleKey === "notifications" || route.moduleKey === "messages") return <NotificationCenterPage />;
  if (route.moduleKey === "reports") return <ReportsAutomationPage />;
  if (route.moduleKey === "retail-pos") return <RetailPosPortalPage />;
  if (route.moduleKey === "manufacturing") return <ManufacturingPortalPage />;
  if (route.moduleKey === "service") return <ServicePortalPage />;
  if (route.moduleKey === "trading") return <TradingPortalPage />;
  if (route.moduleKey === "settings") return <SettingsPortalPage />;
  return <ModulePlaceholderPage module={route.module} route={route} />;
}

export default function PortalRouteLoader({ slug = [] }) {
  const router = useRouter();
  const pathname = buildPath(slug);
  const route = getPortalRoute(pathname);
  const { user, visibleModules = [], loading, error } = useAuth();
  const profile = getRolePortalProfile(user || {});
  const menu = useSidebar(user, visibleModules);
  const safePath = getDefaultPathForUser({ ...(user || {}), visibleModules });
  const allowed = !loading && user ? isPathAllowedForUser(user, route, visibleModules) : true;
  const subtitle = route.isLegacyAlias
    ? `Your ${profile.label} portal menu is role-scoped by ERP type, active plan, company modules, role, and permissions.`
    : route.module?.description;

  useEffect(() => {
    if (!loading && user && !allowed && safePath && safePath !== pathname) {
      router.replace(safePath);
    }
  }, [allowed, loading, pathname, router, safePath, user]);

  return <PortalShell title={route.title} subtitle={subtitle} user={user} menu={menu}>
    {loading ? <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">Loading your portal permissions…</div> : null}
    {error ? <div className="mb-4 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">Could not load live permissions. Showing the role-safe portal menu.</div> : null}
    {!loading && user && !allowed ? <AccessDenied route={route} profile={profile} safePath={safePath} /> : renderPortalContent(route, { user, menu, visibleModules })}
  </PortalShell>;
}
