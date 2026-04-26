"use client";

import PortalShell from "./PortalShell";
import useAuth from "../hooks/useAuth";
import useSidebar from "../hooks/useSidebar";
import { getPortalRoute } from "../config/portalRouteRegistry";
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

function buildPath(slug = []) {
  const parts = Array.isArray(slug) ? slug.filter(Boolean) : [];
  return `/portals${parts.length ? `/${parts.join("/")}` : ""}`;
}

function renderPortalContent(route, context) {
  if (route.moduleKey === "dashboard") return <DynamicPortalHome {...context} />;
  if (route.moduleKey === "system-admin") return <SystemAdminPortalPage />;
  if (route.moduleKey === "companies") return <CompaniesPortalPage />;
  if (route.moduleKey === "erp-templates") return <ErpTemplatesPortalPage />;
  if (route.moduleKey === "roles") return <RolesPage />;
  if (route.moduleKey === "users") return <UsersAccessPage />;
  if (route.moduleKey === "territory") return <TerritoryArchitecturePage />;
  if (route.moduleKey === "products") return <ProductsPortalPage />;
  if (["procurement", "purchase-orders", "supplier-payments", "goods-receipts"].includes(route.moduleKey)) return <ProcurementFoundationPage mode={route.moduleKey} />;
  if (["inventory", "warehouse"].includes(route.moduleKey)) return <InventoryWarehouseFoundationPage mode={route.moduleKey} />;
  if (route.moduleKey === "primary-sales-orders") return <PrimarySalesFoundationPage />;
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
  if (route.moduleKey === "settings") return <SettingsPortalPage />;
  return <ModulePlaceholderPage module={route.module} route={route} />;
}

export default function PortalRouteLoader({ slug = [] }) {
  const pathname = buildPath(slug);
  const route = getPortalRoute(pathname);
  const { user, visibleModules = [], loading, error } = useAuth();
  const menu = useSidebar(user, visibleModules);
  const subtitle = route.isLegacyAlias
    ? `Legacy path mapped to ${route.canonicalPath}. The screen is now rendered through src/features, not role folders.`
    : route.module?.description;

  return <PortalShell title={route.title} subtitle={subtitle} user={user} menu={menu}>
    {loading ? <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">Loading your portal permissions…</div> : null}
    {error ? <div className="mb-4 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">Could not load live permissions. Showing the safe default portal menu.</div> : null}
    {renderPortalContent(route, { user, menu, visibleModules })}
  </PortalShell>;
}
