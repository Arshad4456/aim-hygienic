import TerritoryAssetsRuntimeModule from '../features/runtime-modules/TerritoryAssetsRuntimeModule';
import HRRoleManagementRuntimeModule from '../features/runtime-modules/HRRoleManagementRuntimeModule';
import OrderManagementRuntimeModule from '../features/runtime-modules/OrderManagementRuntimeModule';
import PaymentManagementRuntimeModule from '../features/runtime-modules/PaymentManagementRuntimeModule';
import ExpenseManagementRuntimeModule from '../features/runtime-modules/ExpenseManagementRuntimeModule';
import FinanceAccountsRuntimeModule from '../features/runtime-modules/FinanceAccountsRuntimeModule';
import VehicleManagementRuntimeModule from '../features/runtime-modules/VehicleManagementRuntimeModule';
import GenericRuntimeModuleScreen from '../features/runtime-modules/GenericRuntimeModuleScreen';

const moduleRegistry = {
  territory_assets: TerritoryAssetsRuntimeModule,
  hr_role_management: HRRoleManagementRuntimeModule,
  order_management: OrderManagementRuntimeModule,
  payment_management: PaymentManagementRuntimeModule,
  expense_management: ExpenseManagementRuntimeModule,
  finance_accounts: FinanceAccountsRuntimeModule,
  vehicle_management: VehicleManagementRuntimeModule,
};

export function resolveRuntimeModuleRenderer(moduleCode) {
  return moduleRegistry[String(moduleCode || '').trim().toLowerCase()] || GenericRuntimeModuleScreen;
}
