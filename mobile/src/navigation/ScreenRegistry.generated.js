import S0 from '../features/accountOfficer/index';
import S1 from '../features/admin/[...slug]/index';
import S2 from '../features/admin/account/loan-detail/index';
import S3 from '../features/admin/account/manage/index';
import S4 from '../features/admin/areas/add/index';
import S5 from '../features/admin/areas/index';
import S6 from '../features/admin/assets/vehicles/add/index';
import S7 from '../features/admin/assets/vehicles/index';
import S8 from '../features/admin/companies/add/index';
import S9 from '../features/admin/companies/index';
import S10 from '../features/admin/expense/add/index';
import S11 from '../features/admin/expense/daily/index';
import S12 from '../features/admin/expense/distributor/index';
import S13 from '../features/admin/expense/index';
import S14 from '../features/admin/expense/personal/index';
import S15 from '../features/admin/fields/add/index';
import S16 from '../features/admin/fields/index';
import S17 from '../features/admin/finance/aging/index';
import S18 from '../features/admin/finance/invoices/index';
import S19 from '../features/admin/finance/index';
import S20 from '../features/admin/finance/payments/index';
import S21 from '../features/admin/finance/receipts/index';
import S22 from '../features/admin/hr/index';
import S23 from '../features/admin/inventory/ledger/index';
import S24 from '../features/admin/inventory/low-stock/index';
import S25 from '../features/admin/inventory/summary/index';
import S26 from '../features/admin/inventory/transfers/index';
import S27 from '../features/admin/inventory/warehouses/index';
import S28 from '../features/admin/live-tracking/index';
import S29 from '../features/admin/logistics/index';
import S30 from '../features/admin/logistics/routes/index';
import S31 from '../features/admin/messages/index';
import S32 from '../features/admin/operations/index';
import S33 from '../features/admin/order-management/approvals/index';
import S34 from '../features/admin/order-management/dispatch/index';
import S35 from '../features/admin/order-management/index';
import S36 from '../features/admin/order-management/returns/index';
import S37 from '../features/admin/order-management/sales-orders/index';
import S38 from '../features/admin/index';
import S39 from '../features/admin/procurement/grn/index';
import S40 from '../features/admin/procurement/index';
import S41 from '../features/admin/procurement/payments/index';
import S42 from '../features/admin/procurement/purchase-orders/index';
import S43 from '../features/admin/procurement/suppliers/index';
import S44 from '../features/admin/products/add/index';
import S45 from '../features/admin/products/barcodes/index';
import S46 from '../features/admin/products/index';
import S47 from '../features/admin/products/price-change/index';
import S48 from '../features/admin/quality/final-release/index';
import S49 from '../features/admin/quality/finished-goods/index';
import S50 from '../features/admin/quality/index';
import S51 from '../features/admin/quality/production/index';
import S52 from '../features/admin/quality/raw-material/index';
import S53 from '../features/admin/regions/add/index';
import S54 from '../features/admin/regions/index';
import S55 from '../features/admin/reports/compliance/index';
import S56 from '../features/admin/reports/finance/index';
import S57 from '../features/admin/reports/hr/index';
import S58 from '../features/admin/reports/inventory/index';
import S59 from '../features/admin/reports/logistics/index';
import S60 from '../features/admin/reports/index';
import S61 from '../features/admin/reports/sales/index';
import S62 from '../features/admin/sales-kpi/index';
import S63 from '../features/admin/settings/change-password/index';
import S64 from '../features/admin/settings/index';
import S65 from '../features/admin/users/add/index';
import S66 from '../features/admin/users/index';
import S67 from '../features/admin/vehicle-management/add/index';
import S68 from '../features/admin/vehicle-management/fuel-management/index';
import S69 from '../features/admin/vehicle-management/maintenance/index';
import S70 from '../features/admin/vehicle-management/index';
import S71 from '../features/admin/vehicle-management/vehicles/index';
import S72 from '../features/admin/warehouse-inventory/index';
import S73 from '../features/admin/warehouses/add/index';
import S74 from '../features/admin/warehouses/index';
import S75 from '../features/admin/zones/add/index';
import S76 from '../features/admin/zones/index';
import S77 from '../features/brandManager/messages/index';
import S78 from '../features/brandManager/orders/index';
import S79 from '../features/brandManager/index';
import S80 from '../features/brandManager/primary-order-request/index';
import S81 from '../features/brandManager/return-stock/index';
import S82 from '../features/brandManager/settings/change-password/index';
import S83 from '../features/brandManager/settings/index';
import S84 from '../features/cashier/index';
import S85 from '../features/ceo/index';
import S86 from '../features/customer/orders/index';
import S87 from '../features/customer/index';
import S88 from '../features/customer/receipts/index';
import S89 from '../features/customer/settings/change-password/index';
import S90 from '../features/customer/settings/index';
import S91 from '../features/deliveryBoy/orders/index';
import S92 from '../features/deliveryBoy/index';
import S93 from '../features/distributor/expense/index';
import S94 from '../features/distributor/messages/index';
import S95 from '../features/distributor/orders/index';
import S96 from '../features/distributor/index';
import S97 from '../features/distributor/payments/index';
import S98 from '../features/distributor/payments/primary/index';
import S99 from '../features/distributor/payments/secondary/index';
import S100 from '../features/distributor/primary-order-request/index';
import S101 from '../features/distributor/receipts/index';
import S102 from '../features/distributor/return-stock/index';
import S103 from '../features/distributor/settings/change-password/index';
import S104 from '../features/distributor/settings/index';
import S105 from '../features/fieldSM/index';
import S106 from '../features/hrAssistant/index';
import S107 from '../features/kpo/index';
import S108 from '../features/manageDirector/index';
import S109 from '../features/nationalSM/index';
import S110 from '../features/orderBooker/orders/index';
import S111 from '../features/orderBooker/index';
import S112 from '../features/orderBooker/receipts/index';
import S113 from '../features/regionalSM/index';
import S114 from '../features/salesman/orders/index';
import S115 from '../features/salesman/index';
import S116 from '../features/territorySM/index';
import S117 from '../features/warehouseManager/order-management/index';
import S118 from '../features/warehouseManager/orders/index';
import S119 from '../features/warehouseManager/index';
import S120 from '../features/warehouseManager/payments/index';
import S121 from '../features/warehouseManager/payments/primary/index';
import S122 from '../features/warehouseManager/payments/secondary/index';
import S123 from '../features/warehouseManager/warehouse-inventory/index';
import S124 from '../features/zoneSM/index';

export const SCREEN_COMPONENTS = {
  'accountOfficer__home': S0,
  'admin___slug_': S1,
  'admin__account_loan_detail': S2,
  'admin__account_manage': S3,
  'admin__areas_add': S4,
  'admin__areas': S5,
  'admin__assets_vehicles_add': S6,
  'admin__assets_vehicles': S7,
  'admin__companies_add': S8,
  'admin__companies': S9,
  'admin__expense_add': S10,
  'admin__expense_daily': S11,
  'admin__expense_distributor': S12,
  'admin__expense': S13,
  'admin__expense_personal': S14,
  'admin__fields_add': S15,
  'admin__fields': S16,
  'admin__finance_aging': S17,
  'admin__finance_invoices': S18,
  'admin__finance': S19,
  'admin__finance_payments': S20,
  'admin__finance_receipts': S21,
  'admin__hr': S22,
  'admin__inventory_ledger': S23,
  'admin__inventory_low_stock': S24,
  'admin__inventory_summary': S25,
  'admin__inventory_transfers': S26,
  'admin__inventory_warehouses': S27,
  'admin__live_tracking': S28,
  'admin__logistics': S29,
  'admin__logistics_routes': S30,
  'admin__messages': S31,
  'admin__operations': S32,
  'admin__order_management_approvals': S33,
  'admin__order_management_dispatch': S34,
  'admin__order_management': S35,
  'admin__order_management_returns': S36,
  'admin__order_management_sales_orders': S37,
  'admin__home': S38,
  'admin__procurement_grn': S39,
  'admin__procurement': S40,
  'admin__procurement_payments': S41,
  'admin__procurement_purchase_orders': S42,
  'admin__procurement_suppliers': S43,
  'admin__products_add': S44,
  'admin__products_barcodes': S45,
  'admin__products': S46,
  'admin__products_price_change': S47,
  'admin__quality_final_release': S48,
  'admin__quality_finished_goods': S49,
  'admin__quality': S50,
  'admin__quality_production': S51,
  'admin__quality_raw_material': S52,
  'admin__regions_add': S53,
  'admin__regions': S54,
  'admin__reports_compliance': S55,
  'admin__reports_finance': S56,
  'admin__reports_hr': S57,
  'admin__reports_inventory': S58,
  'admin__reports_logistics': S59,
  'admin__reports': S60,
  'admin__reports_sales': S61,
  'admin__sales_kpi': S62,
  'admin__settings_change_password': S63,
  'admin__settings': S64,
  'admin__users_add': S65,
  'admin__users': S66,
  'admin__vehicle_management_add': S67,
  'admin__vehicle_management_fuel_management': S68,
  'admin__vehicle_management_maintenance': S69,
  'admin__vehicle_management': S70,
  'admin__vehicle_management_vehicles': S71,
  'admin__warehouse_inventory': S72,
  'admin__warehouses_add': S73,
  'admin__warehouses': S74,
  'admin__zones_add': S75,
  'admin__zones': S76,
  'brandManager__messages': S77,
  'brandManager__orders': S78,
  'brandManager__home': S79,
  'brandManager__primary_order_request': S80,
  'brandManager__return_stock': S81,
  'brandManager__settings_change_password': S82,
  'brandManager__settings': S83,
  'cashier__home': S84,
  'ceo__home': S85,
  'customer__orders': S86,
  'customer__home': S87,
  'customer__receipts': S88,
  'customer__settings_change_password': S89,
  'customer__settings': S90,
  'deliveryBoy__orders': S91,
  'deliveryBoy__home': S92,
  'distributor__expense': S93,
  'distributor__messages': S94,
  'distributor__orders': S95,
  'distributor__home': S96,
  'distributor__payments': S97,
  'distributor__payments_primary': S98,
  'distributor__payments_secondary': S99,
  'distributor__primary_order_request': S100,
  'distributor__receipts': S101,
  'distributor__return_stock': S102,
  'distributor__settings_change_password': S103,
  'distributor__settings': S104,
  'fieldSM__home': S105,
  'hrAssistant__home': S106,
  'kpo__home': S107,
  'manageDirector__home': S108,
  'nationalSM__home': S109,
  'orderBooker__orders': S110,
  'orderBooker__home': S111,
  'orderBooker__receipts': S112,
  'regionalSM__home': S113,
  'salesman__orders': S114,
  'salesman__home': S115,
  'territorySM__home': S116,
  'warehouseManager__order_management': S117,
  'warehouseManager__orders': S118,
  'warehouseManager__home': S119,
  'warehouseManager__payments': S120,
  'warehouseManager__payments_primary': S121,
  'warehouseManager__payments_secondary': S122,
  'warehouseManager__warehouse_inventory': S123,
  'zoneSM__home': S124,
};
