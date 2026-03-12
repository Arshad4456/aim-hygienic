import TerritoryAssetsRuntimeModule from "./modules/TerritoryAssetsRuntimeModule";
import HRRoleManagementRuntimeModule from "./modules/HRRoleManagementRuntimeModule";
import OrderManagementRuntimeModule from "./modules/OrderManagementRuntimeModule";
import PaymentManagementRuntimeModule from "./modules/PaymentManagementRuntimeModule";
import ExpenseManagementRuntimeModule from "./modules/ExpenseManagementRuntimeModule";
import FinanceAccountsRuntimeModule from "./modules/FinanceAccountsRuntimeModule";
import VehicleManagementRuntimeModule from "./modules/VehicleManagementRuntimeModule";
import GenericRuntimeModuleRenderer from "./modules/GenericRuntimeModuleRenderer";

export function RuntimeModuleRenderer({ moduleItem, dashboard }) {
  const moduleCode = String(moduleItem?.moduleCode || "").trim().toLowerCase();

  if (moduleCode === "territory_assets") return <TerritoryAssetsRuntimeModule moduleItem={moduleItem} dashboard={dashboard} />;
  if (moduleCode === "hr_role_management") return <HRRoleManagementRuntimeModule moduleItem={moduleItem} dashboard={dashboard} />;
  if (moduleCode === "order_management") return <OrderManagementRuntimeModule moduleItem={moduleItem} dashboard={dashboard} />;
  if (moduleCode === "payment_management") return <PaymentManagementRuntimeModule moduleItem={moduleItem} dashboard={dashboard} />;
  if (moduleCode === "expense_management") return <ExpenseManagementRuntimeModule moduleItem={moduleItem} dashboard={dashboard} />;
  if (moduleCode === "finance_accounts") return <FinanceAccountsRuntimeModule moduleItem={moduleItem} dashboard={dashboard} />;
  if (moduleCode === "vehicle_management") return <VehicleManagementRuntimeModule moduleItem={moduleItem} dashboard={dashboard} />;

  return <GenericRuntimeModuleRenderer moduleItem={moduleItem} dashboard={dashboard} />;
}

export { GenericRuntimeModuleRenderer };
