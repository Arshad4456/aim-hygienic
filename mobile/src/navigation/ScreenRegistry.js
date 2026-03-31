import S0 from '../screens/accountOfficer/DashboardScreen';
import S1 from '../screens/admin/account/loan-detail/LoanDetailScreen';
import S2 from '../screens/admin/account/manage/ManageScreen';
import S3 from '../screens/admin/areas/add/AddScreen';
import S4 from '../screens/admin/areas/AreasScreen';
import S5 from '../screens/admin/assets/vehicles/add/AddScreen';
import S6 from '../screens/admin/assets/vehicles/VehiclesScreen';
import S7 from '../screens/admin/companies/add/AddScreen';
import S8 from '../screens/admin/companies/CompaniesScreen';
import S9 from '../screens/admin/expense/add/AddScreen';
import S10 from '../screens/admin/expense/daily/DailyScreen';
import S11 from '../screens/admin/expense/distributor/DistributorScreen';
import S12 from '../screens/admin/expense/ExpenseScreen';
import S13 from '../screens/admin/expense/personal/PersonalScreen';
import S14 from '../screens/admin/fields/add/AddScreen';
import S15 from '../screens/admin/fields/FieldsScreen';
import S16 from '../screens/admin/finance/aging/AgingScreen';
import S17 from '../screens/admin/finance/invoices/InvoicesScreen';
import S18 from '../screens/admin/finance/FinanceScreen';
import S19 from '../screens/admin/finance/payments/PaymentsScreen';
import S20 from '../screens/admin/finance/receipts/ReceiptsScreen';
import S21 from '../screens/admin/hr/HrScreen';
import S22 from '../screens/admin/inventory/ledger/LedgerScreen';
import S23 from '../screens/admin/inventory/low-stock/LowStockScreen';
import S24 from '../screens/admin/inventory/summary/SummaryScreen';
import S25 from '../screens/admin/inventory/transfers/TransfersScreen';
import S26 from '../screens/admin/inventory/warehouses/WarehousesScreen';
import S26a from '../screens/admin/inventory/purchase-stock/PurchaseStockScreen';
import S26b from '../screens/admin/inventory/sale-stock/SaleStockScreen';
import S26c from '../screens/admin/inventory/damage-stock/DamageStockScreen';
import S26d from '../screens/admin/inventory/return-stock/ReturnStockScreen';
import S27 from '../screens/admin/live-tracking/LiveTrackingScreen';
import S28 from '../screens/admin/logistics/LogisticsScreen';
import S29 from '../screens/admin/logistics/routes/RoutesScreen';
import S30 from '../screens/admin/messages/MessagesScreen';
import S31 from '../screens/admin/operations/OperationsScreen';
import S32 from '../screens/admin/order-management/approvals/ApprovalsScreen';
import S33 from '../screens/admin/order-management/dispatch/DispatchScreen';
import S34 from '../screens/admin/order-management/OrderManagementScreen';
import S35 from '../screens/admin/order-management/returns/ReturnsScreen';
import S36 from '../screens/admin/order-management/sales-orders/SalesOrdersScreen';
import S37 from '../screens/admin/DashboardScreen';
import S38 from '../screens/admin/procurement/grn/GrnScreen';
import S39 from '../screens/admin/procurement/ProcurementScreen';
import S40 from '../screens/admin/procurement/payments/PaymentsScreen';
import S41 from '../screens/admin/procurement/purchase-orders/PurchaseOrdersScreen';
import S42 from '../screens/admin/procurement/suppliers/SuppliersScreen';
import S43 from '../screens/admin/products/add/AddScreen';
import S44 from '../screens/admin/products/barcodes/BarcodesScreen';
import S45 from '../screens/admin/products/ProductsScreen';
import S46 from '../screens/admin/products/price-change/PriceChangeScreen';
import S47 from '../screens/admin/quality/final-release/FinalReleaseScreen';
import S48 from '../screens/admin/quality/finished-goods/FinishedGoodsScreen';
import S49 from '../screens/admin/quality/QualityScreen';
import S50 from '../screens/admin/quality/production/ProductionScreen';
import S51 from '../screens/admin/quality/raw-material/RawMaterialScreen';
import S52 from '../screens/admin/regions/add/AddScreen';
import S53 from '../screens/admin/regions/RegionsScreen';
import S54 from '../screens/admin/reports/compliance/ComplianceScreen';
import S55 from '../screens/admin/reports/finance/FinanceScreen';
import S56 from '../screens/admin/reports/hr/HrScreen';
import S57 from '../screens/admin/reports/inventory/InventoryScreen';
import S58 from '../screens/admin/reports/logistics/LogisticsScreen';
import S59 from '../screens/admin/reports/ReportsScreen';
import S60 from '../screens/admin/reports/sales/SalesScreen';
import S61 from '../screens/admin/sales-kpi/SalesKpiScreen';
import S62 from '../screens/admin/settings/change-password/ChangePasswordScreen';
import S63 from '../screens/admin/settings/SettingsScreen';
import S64 from '../screens/admin/users/add/AddScreen';
import S65 from '../screens/admin/users/UsersScreen';
import S66 from '../screens/admin/vehicle-management/add/AddScreen';
import S67 from '../screens/admin/vehicle-management/fuel-management/FuelManagementScreen';
import S68 from '../screens/admin/vehicle-management/maintenance/MaintenanceScreen';
import S69 from '../screens/admin/vehicle-management/VehicleManagementScreen';
import S70 from '../screens/admin/vehicle-management/vehicles/VehiclesScreen';
import S71 from '../screens/admin/warehouse-inventory/WarehouseInventoryScreen';
import S72 from '../screens/admin/warehouses/add/AddScreen';
import S73 from '../screens/admin/warehouses/WarehousesScreen';
import S74 from '../screens/admin/zones/add/AddScreen';
import S75 from '../screens/admin/zones/ZonesScreen';
import S76 from '../screens/brandManager/messages/MessagesScreen';
import S77 from '../screens/brandManager/orders/OrdersScreen';
import S78 from '../screens/brandManager/DashboardScreen';
import S79 from '../screens/brandManager/primary-order-request/PrimaryOrderRequestScreen';
import S80 from '../screens/brandManager/return-stock/ReturnStockScreen';
import S81 from '../screens/brandManager/settings/change-password/ChangePasswordScreen';
import S82 from '../screens/brandManager/settings/SettingsScreen';
import S83 from '../screens/cashier/DashboardScreen';
import S84 from '../screens/ceo/DashboardScreen';
import S85 from '../screens/customer/orders/OrdersScreen';
import S86 from '../screens/customer/DashboardScreen';
import S87 from '../screens/customer/receipts/ReceiptsScreen';
import S88 from '../screens/customer/settings/change-password/ChangePasswordScreen';
import S89 from '../screens/customer/settings/SettingsScreen';
import S90 from '../screens/deliveryBoy/orders/OrdersScreen';
import S91 from '../screens/deliveryBoy/DashboardScreen';
import S92 from '../screens/distributor/expense/ExpenseScreen';
import S93 from '../screens/distributor/messages/MessagesScreen';
import S94 from '../screens/distributor/orders/OrdersScreen';
import S95 from '../screens/distributor/DashboardScreen';
import S96 from '../screens/distributor/payments/PaymentsScreen';
import S97 from '../screens/distributor/payments/primary/PrimaryScreen';
import S98 from '../screens/distributor/payments/secondary/SecondaryScreen';
import S99 from '../screens/distributor/primary-order-request/PrimaryOrderRequestScreen';
import S100 from '../screens/distributor/receipts/ReceiptsScreen';
import S101 from '../screens/distributor/return-stock/ReturnStockScreen';
import S102 from '../screens/distributor/settings/change-password/ChangePasswordScreen';
import S103 from '../screens/distributor/settings/SettingsScreen';
import S104 from '../screens/fieldSM/DashboardScreen';
import S105 from '../screens/hrAssistant/DashboardScreen';
import S106 from '../screens/kpo/DashboardScreen';
import S107 from '../screens/manageDirector/DashboardScreen';
import S108 from '../screens/nationalSM/DashboardScreen';
import S109 from '../screens/orderBooker/orders/OrdersScreen';
import S110 from '../screens/orderBooker/DashboardScreen';
import S111 from '../screens/orderBooker/receipts/ReceiptsScreen';
import S112 from '../screens/regionalSM/DashboardScreen';
import S113 from '../screens/salesman/orders/OrdersScreen';
import S114 from '../screens/salesman/DashboardScreen';
import S115 from '../screens/territorySM/DashboardScreen';
import S116 from '../screens/warehouseManager/order-management/OrderManagementScreen';
import S117 from '../screens/warehouseManager/orders/OrdersScreen';
import S118 from '../screens/warehouseManager/DashboardScreen';
import S119 from '../screens/warehouseManager/payments/PaymentsScreen';
import S120 from '../screens/warehouseManager/payments/primary/PrimaryScreen';
import S121 from '../screens/warehouseManager/payments/secondary/SecondaryScreen';
import S122 from '../screens/warehouseManager/warehouse-inventory/WarehouseInventoryScreen';
import S123 from '../screens/zoneSM/DashboardScreen';
import S124 from '../screens/supplier/DashboardScreen';
import S125 from '../screens/vendor/DashboardScreen';

export const screenRegistry = {
  'accountOfficer:dashboard': S0,
  'admin:account/loan-detail': S1,
  'admin:account/manage': S2,
  'admin:areas/add': S3,
  'admin:areas': S4,
  'admin:assets/vehicles/add': S5,
  'admin:assets/vehicles': S6,
  'admin:companies/add': S7,
  'admin:companies': S8,
  'admin:expense/add': S9,
  'admin:expense/daily': S10,
  'admin:expense/distributor': S11,
  'admin:expense': S12,
  'admin:expense/personal': S13,
  'admin:fields/add': S14,
  'admin:fields': S15,
  'admin:finance/aging': S16,
  'admin:finance/invoices': S17,
  'admin:finance': S18,
  'admin:finance/payments': S19,
  'admin:finance/receipts': S20,
  'admin:hr': S21,
  'admin:inventory/ledger': S22,
  'admin:inventory/low-stock': S23,
  'admin:inventory/summary': S24,
  'admin:inventory/transfers': S25,
  'admin:inventory/warehouses': S26,
  'admin:inventory/purchase-stock': S26a,
  'admin:inventory/sale-stock': S26b,
  'admin:inventory/damage-stock': S26c,
  'admin:inventory/return-stock': S26d,
  'admin:live-tracking': S27,
  'admin:logistics': S28,
  'admin:logistics/routes': S29,
  'admin:messages': S30,
  'admin:operations': S31,
  'admin:order-management/approvals': S32,
  'admin:order-management/dispatch': S33,
  'admin:order-management': S34,
  'admin:order-management/returns': S35,
  'admin:order-management/sales-orders': S36,
  'admin:dashboard': S37,
  'admin:procurement/grn': S38,
  'admin:procurement': S39,
  'admin:procurement/payments': S40,
  'admin:procurement/purchase-orders': S41,
  'admin:procurement/suppliers': S42,
  'admin:products/add': S43,
  'admin:products/barcodes': S44,
  'admin:products': S45,
  'admin:products/price-change': S46,
  'admin:quality/final-release': S47,
  'admin:quality/finished-goods': S48,
  'admin:quality': S49,
  'admin:quality/production': S50,
  'admin:quality/raw-material': S51,
  'admin:regions/add': S52,
  'admin:regions': S53,
  'admin:reports/compliance': S54,
  'admin:reports/finance': S55,
  'admin:reports/hr': S56,
  'admin:reports/inventory': S57,
  'admin:reports/logistics': S58,
  'admin:reports': S59,
  'admin:reports/sales': S60,
  'admin:sales-kpi': S61,
  'admin:settings/change-password': S62,
  'admin:settings': S63,
  'admin:users/add': S64,
  'admin:users': S65,
  'admin:vehicle-management/add': S66,
  'admin:vehicle-management/fuel-management': S67,
  'admin:vehicle-management/maintenance': S68,
  'admin:vehicle-management': S69,
  'admin:vehicle-management/vehicles': S70,
  'admin:warehouse-inventory': S71,
  'admin:warehouses/add': S72,
  'admin:warehouses': S73,
  'admin:zones/add': S74,
  'admin:zones': S75,
  'brandManager:messages': S76,
  'brandManager:orders': S77,
  'brandManager:dashboard': S78,
  'brandManager:primary-order-request': S79,
  'brandManager:return-stock': S80,
  'brandManager:settings/change-password': S81,
  'brandManager:settings': S82,
  'cashier:dashboard': S83,
  'ceo:dashboard': S84,
  'customer:orders': S85,
  'customer:dashboard': S86,
  'customer:receipts': S87,
  'customer:settings/change-password': S88,
  'customer:settings': S89,
  'deliveryBoy:orders': S90,
  'deliveryBoy:dashboard': S91,
  'distributor:expense': S92,
  'distributor:messages': S93,
  'distributor:orders': S94,
  'distributor:dashboard': S95,
  'distributor:payments': S96,
  'distributor:payments/primary': S97,
  'distributor:payments/secondary': S98,
  'distributor:primary-order-request': S99,
  'distributor:receipts': S100,
  'distributor:return-stock': S101,
  'distributor:settings/change-password': S102,
  'distributor:settings': S103,
  'fieldSM:dashboard': S104,
  'hrAssistant:dashboard': S105,
  'kpo:dashboard': S106,
  'manageDirector:dashboard': S107,
  'nationalSM:dashboard': S108,
  'orderBooker:orders': S109,
  'orderBooker:dashboard': S110,
  'orderBooker:receipts': S111,
  'regionalSM:dashboard': S112,
  'salesman:orders': S113,
  'salesman:dashboard': S114,
  'territorySM:dashboard': S115,
  'warehouseManager:order-management': S116,
  'warehouseManager:orders': S117,
  'warehouseManager:dashboard': S118,
  'warehouseManager:payments': S119,
  'warehouseManager:payments/primary': S120,
  'warehouseManager:payments/secondary': S121,
  'warehouseManager:warehouse-inventory': S122,
  'zoneSM:dashboard': S123,
  'supplier:dashboard': S124,
  'vendor:dashboard': S125,
};