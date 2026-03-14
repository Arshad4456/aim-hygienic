import TerritoryAssetsRuntimeModule from "./modules/TerritoryAssetsRuntimeModule";
import HRRoleManagementRuntimeModule from "./modules/HRRoleManagementRuntimeModule";
import OrderManagementRuntimeModule from "./modules/OrderManagementRuntimeModule";
import PaymentManagementRuntimeModule from "./modules/PaymentManagementRuntimeModule";
import ExpenseManagementRuntimeModule from "./modules/ExpenseManagementRuntimeModule";
import FinanceAccountsRuntimeModule from "./modules/FinanceAccountsRuntimeModule";
import VehicleManagementRuntimeModule from "./modules/VehicleManagementRuntimeModule";
import GenericRuntimeModuleRenderer from "./modules/GenericRuntimeModuleRenderer";

export const RUNTIME_MODULE_REGISTRY = {
  territory_assets: TerritoryAssetsRuntimeModule,
  hr_role_management: HRRoleManagementRuntimeModule,
  order_management: OrderManagementRuntimeModule,
  payment_management: PaymentManagementRuntimeModule,
  expense_management: ExpenseManagementRuntimeModule,
  finance_accounts: FinanceAccountsRuntimeModule,
  vehicle_management: VehicleManagementRuntimeModule,
};

export function resolveRuntimeModuleRenderer(moduleCode) {
  return RUNTIME_MODULE_REGISTRY[String(moduleCode || '').trim().toLowerCase()] || GenericRuntimeModuleRenderer;
}

export function RuntimeModuleRenderer({ moduleItem, dashboard }) {
  const Renderer = resolveRuntimeModuleRenderer(moduleItem?.moduleCode);
  return <Renderer moduleItem={moduleItem} dashboard={dashboard} />;
}
