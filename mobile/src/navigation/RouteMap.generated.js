export const ROUTE_MAP = [
  {
    "role": "accountOfficer",
    "slug": "home",
    "routeName": "accountOfficer__home",
    "title": "accountOfficer Home",
    "file": "frontend/app/dashboards/accountOfficer/page.js",
    "endpoints": [],
    "primaryEndpoint": null,
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "[...slug]",
    "routeName": "admin___slug_",
    "title": "Catch All",
    "file": "frontend/app/dashboards/admin/[...slug]/page.js",
    "endpoints": [],
    "primaryEndpoint": null,
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "account/loan-detail",
    "routeName": "admin__account_loan_detail",
    "title": "Account / Loan Detail",
    "file": "frontend/app/dashboards/admin/account/loan-detail/page.js",
    "endpoints": [
      "/accounts",
      "/loans?loanType=${tab}",
      "/loans/summary",
      "/loans/${id}",
      "/loans",
      "/loans/${returnForm.loanId}/payments"
    ],
    "primaryEndpoint": "/accounts",
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "account/manage",
    "routeName": "admin__account_manage",
    "title": "Account / Manage",
    "file": "frontend/app/dashboards/admin/account/manage/page.js",
    "endpoints": [
      "/accounts",
      "/accounts/${id}",
      "/accounts/${id}/transactions",
      "/accounts",
      "/accounts/${editModal.data._id}",
      "/accounts/${id}/deactivate",
      "/accounts/${id}",
      "/accounts/${selectedAccountId}/transactions"
    ],
    "primaryEndpoint": "/accounts",
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "areas/add",
    "routeName": "admin__areas_add",
    "title": "Areas / Add",
    "file": "frontend/app/dashboards/admin/areas/add/page.js",
    "endpoints": [
      "/warehouses",
      "/regions",
      "/zones",
      "/areas"
    ],
    "primaryEndpoint": "/warehouses",
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "areas",
    "routeName": "admin__areas",
    "title": "Areas",
    "file": "frontend/app/dashboards/admin/areas/page.js",
    "endpoints": [
      "/areas?${params.toString()}",
      "/warehouses",
      "/regions",
      "/zones",
      "/areas/${edit._id}",
      "/areas/${id}"
    ],
    "primaryEndpoint": "/areas?${params.toString()}",
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "assets/vehicles/add",
    "routeName": "admin__assets_vehicles_add",
    "title": "Assets / Vehicles / Add",
    "file": "frontend/app/dashboards/admin/assets/vehicles/add/page.js",
    "endpoints": [],
    "primaryEndpoint": null,
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "assets/vehicles",
    "routeName": "admin__assets_vehicles",
    "title": "Assets / Vehicles",
    "file": "frontend/app/dashboards/admin/assets/vehicles/page.js",
    "endpoints": [],
    "primaryEndpoint": null,
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "companies/add",
    "routeName": "admin__companies_add",
    "title": "Companies / Add",
    "file": "frontend/app/dashboards/admin/companies/add/page.js",
    "endpoints": [
      "/companies"
    ],
    "primaryEndpoint": "/companies",
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "companies",
    "routeName": "admin__companies",
    "title": "Companies",
    "file": "frontend/app/dashboards/admin/companies/page.js",
    "endpoints": [
      "/companies",
      "/companies/${id}",
      "/companies/${id}"
    ],
    "primaryEndpoint": "/companies",
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "expense/add",
    "routeName": "admin__expense_add",
    "title": "Expense / Add",
    "file": "frontend/app/dashboards/admin/expense/add/page.js",
    "endpoints": [
      "/expenses"
    ],
    "primaryEndpoint": "/expenses",
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "expense/daily",
    "routeName": "admin__expense_daily",
    "title": "Expense / Daily",
    "file": "frontend/app/dashboards/admin/expense/daily/page.js",
    "endpoints": [
      "/expenses?section=daily",
      "/users",
      "/accounts",
      "/expenses",
      "/expenses/${id}"
    ],
    "primaryEndpoint": "/expenses?section=daily",
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "expense/distributor",
    "routeName": "admin__expense_distributor",
    "title": "Expense / Distributor",
    "file": "frontend/app/dashboards/admin/expense/distributor/page.js",
    "endpoints": [
      "/expenses?section=distributor",
      "/accounts",
      "/users",
      "/expenses",
      "/expenses/${id}",
      "/expenses/${row._id}"
    ],
    "primaryEndpoint": "/expenses?section=distributor",
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "expense",
    "routeName": "admin__expense",
    "title": "Expense",
    "file": "frontend/app/dashboards/admin/expense/page.js",
    "endpoints": [
      "/expenses"
    ],
    "primaryEndpoint": "/expenses",
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "expense/personal",
    "routeName": "admin__expense_personal",
    "title": "Expense / Personal",
    "file": "frontend/app/dashboards/admin/expense/personal/page.js",
    "endpoints": [
      "/expenses?section=personal",
      "/accounts",
      "/expenses",
      "/expenses/${id}"
    ],
    "primaryEndpoint": "/expenses?section=personal",
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "fields/add",
    "routeName": "admin__fields_add",
    "title": "Fields / Add",
    "file": "frontend/app/dashboards/admin/fields/add/page.js",
    "endpoints": [
      "/warehouses",
      "/regions",
      "/zones",
      "/areas"
    ],
    "primaryEndpoint": "/warehouses",
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "fields",
    "routeName": "admin__fields",
    "title": "Fields",
    "file": "frontend/app/dashboards/admin/fields/page.js",
    "endpoints": [
      "/warehouses",
      "/regions",
      "/zones",
      "/areas"
    ],
    "primaryEndpoint": "/warehouses",
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "finance/aging",
    "routeName": "admin__finance_aging",
    "title": "Finance / Aging",
    "file": "frontend/app/dashboards/admin/finance/aging/page.js",
    "endpoints": [
      "/orders?limit=500",
      "/receipts?status=approved"
    ],
    "primaryEndpoint": "/orders?limit=500",
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "finance/invoices",
    "routeName": "admin__finance_invoices",
    "title": "Finance / Invoices",
    "file": "frontend/app/dashboards/admin/finance/invoices/page.js",
    "endpoints": [
      "/orders?limit=200"
    ],
    "primaryEndpoint": "/orders?limit=200",
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "finance",
    "routeName": "admin__finance",
    "title": "Finance",
    "file": "frontend/app/dashboards/admin/finance/page.js",
    "endpoints": [
      "/reports/finance"
    ],
    "primaryEndpoint": "/reports/finance",
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "finance/payments",
    "routeName": "admin__finance_payments",
    "title": "Finance / Payments",
    "file": "frontend/app/dashboards/admin/finance/payments/page.js",
    "endpoints": [
      "/payments/masters",
      "/payments/primary",
      "/payments/secondary",
      "/payments/primary",
      "/payments/secondary",
      "/payments/primary/${id}",
      "/payments/secondary/${id}",
      "/payments/primary/${invoiceNo}"
    ],
    "primaryEndpoint": "/payments/masters",
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "finance/receipts",
    "routeName": "admin__finance_receipts",
    "title": "Finance / Receipts",
    "file": "frontend/app/dashboards/admin/finance/receipts/page.js",
    "endpoints": [
      "/receipts?${q.toString()}",
      "/receipts/${id}/approve",
      "/receipts/${rejecting._id}/reject"
    ],
    "primaryEndpoint": "/receipts?${q.toString()}",
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "hr",
    "routeName": "admin__hr",
    "title": "Hr",
    "file": "frontend/app/dashboards/admin/hr/page.js",
    "endpoints": [],
    "primaryEndpoint": null,
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "inventory/ledger",
    "routeName": "admin__inventory_ledger",
    "title": "Inventory / Ledger",
    "file": "frontend/app/dashboards/admin/inventory/ledger/page.js",
    "endpoints": [
      "/products",
      "/warehouses",
      "/regions",
      "/zones",
      "/areas",
      "/inventory/movements",
      "/inventory/movements",
      "/inventory/movements/${editId}",
      "/inventory/movements/clear"
    ],
    "primaryEndpoint": "/products",
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "inventory/low-stock",
    "routeName": "admin__inventory_low_stock",
    "title": "Inventory / Low Stock",
    "file": "frontend/app/dashboards/admin/inventory/low-stock/page.js",
    "endpoints": [
      "/inventory/low-stock",
      "/products/${editId}"
    ],
    "primaryEndpoint": "/inventory/low-stock",
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "inventory/summary",
    "routeName": "admin__inventory_summary",
    "title": "Inventory / Summary",
    "file": "frontend/app/dashboards/admin/inventory/summary/page.js",
    "endpoints": [
      "/inventory/summary${warehouseId ? ",
      "/warehouses",
      "/products"
    ],
    "primaryEndpoint": "/inventory/summary${warehouseId ? ",
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "inventory/transfers",
    "routeName": "admin__inventory_transfers",
    "title": "Inventory / Transfers",
    "file": "frontend/app/dashboards/admin/inventory/transfers/page.js",
    "endpoints": [
      "/products",
      "/warehouses",
      "/inventory/transfers",
      "/inventory/transfers",
      "/inventory/transfers/${editId}"
    ],
    "primaryEndpoint": "/products",
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "inventory/warehouses",
    "routeName": "admin__inventory_warehouses",
    "title": "Inventory / Warehouses",
    "file": "frontend/app/dashboards/admin/inventory/warehouses/page.js",
    "endpoints": [
      "/warehouses"
    ],
    "primaryEndpoint": "/warehouses",
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "live-tracking",
    "routeName": "admin__live_tracking",
    "title": "Live Tracking",
    "file": "frontend/app/dashboards/admin/live-tracking/page.js",
    "endpoints": [
      "/live-tracking/summary",
      "/live-tracking/users",
      "/live-tracking/vehicles",
      "/live-tracking/dispatches"
    ],
    "primaryEndpoint": "/live-tracking/summary",
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "logistics",
    "routeName": "admin__logistics",
    "title": "Logistics",
    "file": "frontend/app/dashboards/admin/logistics/page.js",
    "endpoints": [
      "/reports/logistics",
      "/orders/dispatch"
    ],
    "primaryEndpoint": "/reports/logistics",
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "logistics/routes",
    "routeName": "admin__logistics_routes",
    "title": "Logistics / Routes",
    "file": "frontend/app/dashboards/admin/logistics/routes/page.js",
    "endpoints": [
      "/warehouses",
      "/regions",
      "/zones",
      "/areas",
      "/vehicles",
      "/orders/dispatch"
    ],
    "primaryEndpoint": "/warehouses",
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "messages",
    "routeName": "admin__messages",
    "title": "Messages",
    "file": "frontend/app/dashboards/admin/messages/page.js",
    "endpoints": [
      "/messages"
    ],
    "primaryEndpoint": "/messages",
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "operations",
    "routeName": "admin__operations",
    "title": "Operations",
    "file": "frontend/app/dashboards/admin/operations/page.js",
    "endpoints": [
      "/dashboard/operations"
    ],
    "primaryEndpoint": "/dashboard/operations",
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "order-management/approvals",
    "routeName": "admin__order_management_approvals",
    "title": "Order Management / Approvals",
    "file": "frontend/app/dashboards/admin/order-management/approvals/page.js",
    "endpoints": [
      "/orders/approvals",
      "/orders/${orderId}/status"
    ],
    "primaryEndpoint": "/orders/approvals",
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "order-management/dispatch",
    "routeName": "admin__order_management_dispatch",
    "title": "Order Management / Dispatch",
    "file": "frontend/app/dashboards/admin/order-management/dispatch/page.js",
    "endpoints": [
      "/orders/dispatch",
      "/vehicles",
      "/users",
      "/orders/${orderId}/status"
    ],
    "primaryEndpoint": "/orders/dispatch",
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "order-management",
    "routeName": "admin__order_management",
    "title": "Order Management",
    "file": "frontend/app/dashboards/admin/order-management/page.js",
    "endpoints": [
      "/orders",
      "/inventory/transactions",
      "/warehouses",
      "/products",
      "/regions",
      "/zones",
      "/users",
      "/fields?limit=500",
      "/inventory/transactions",
      "/inventory/transactions",
      "/orders",
      "/inventory/transactions/${id}/mark-read",
      "/inventory/transactions/${id}/request-status",
      "/orders/${id}/mark-read",
      "/orders/${id}/status",
      "/inventory/transactions/${row._id}"
    ],
    "primaryEndpoint": "/orders",
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "order-management/returns",
    "routeName": "admin__order_management_returns",
    "title": "Order Management / Returns",
    "file": "frontend/app/dashboards/admin/order-management/returns/page.js",
    "endpoints": [
      "/inventory/transactions?transactionType=RETURN_STOCK",
      "/warehouses",
      "/products",
      "/regions",
      "/zones",
      "/inventory/transactions/${id}/mark-read",
      "/inventory/transactions/${id}/request-status",
      "/inventory/transactions/${id}",
      "/inventory/transactions"
    ],
    "primaryEndpoint": "/inventory/transactions?transactionType=RETURN_STOCK",
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "order-management/sales-orders",
    "routeName": "admin__order_management_sales_orders",
    "title": "Order Management / Sales Orders",
    "file": "frontend/app/dashboards/admin/order-management/sales-orders/page.js",
    "endpoints": [],
    "primaryEndpoint": null,
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "home",
    "routeName": "admin__home",
    "title": "admin Home",
    "file": "frontend/app/dashboards/admin/page.js",
    "endpoints": [
      "/dashboard/overview"
    ],
    "primaryEndpoint": "/dashboard/overview",
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "procurement/grn",
    "routeName": "admin__procurement_grn",
    "title": "Procurement / Grn",
    "file": "frontend/app/dashboards/admin/procurement/grn/page.js",
    "endpoints": [
      "/inventory/movements?movementType=PURCHASE_IN"
    ],
    "primaryEndpoint": "/inventory/movements?movementType=PURCHASE_IN",
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "procurement",
    "routeName": "admin__procurement",
    "title": "Procurement",
    "file": "frontend/app/dashboards/admin/procurement/page.js",
    "endpoints": [
      "/reports/procurement"
    ],
    "primaryEndpoint": "/reports/procurement",
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "procurement/payments",
    "routeName": "admin__procurement_payments",
    "title": "Procurement / Payments",
    "file": "frontend/app/dashboards/admin/procurement/payments/page.js",
    "endpoints": [
      "/expenses"
    ],
    "primaryEndpoint": "/expenses",
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "procurement/purchase-orders",
    "routeName": "admin__procurement_purchase_orders",
    "title": "Procurement / Purchase Orders",
    "file": "frontend/app/dashboards/admin/procurement/purchase-orders/page.js",
    "endpoints": [
      "/inventory/movements?movementType=PURCHASE_IN",
      "/warehouses"
    ],
    "primaryEndpoint": "/inventory/movements?movementType=PURCHASE_IN",
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "procurement/suppliers",
    "routeName": "admin__procurement_suppliers",
    "title": "Procurement / Suppliers",
    "file": "frontend/app/dashboards/admin/procurement/suppliers/page.js",
    "endpoints": [
      "/users?role=Supplier"
    ],
    "primaryEndpoint": "/users?role=Supplier",
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "products/add",
    "routeName": "admin__products_add",
    "title": "Products / Add",
    "file": "frontend/app/dashboards/admin/products/add/page.js",
    "endpoints": [
      "/companies",
      "/products",
      "/products/bulk-upsert"
    ],
    "primaryEndpoint": "/companies",
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "products/barcodes",
    "routeName": "admin__products_barcodes",
    "title": "Products / Barcodes",
    "file": "frontend/app/dashboards/admin/products/barcodes/page.js",
    "endpoints": [
      "/products/barcodes"
    ],
    "primaryEndpoint": "/products/barcodes",
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "products",
    "routeName": "admin__products",
    "title": "Products",
    "file": "frontend/app/dashboards/admin/products/page.js",
    "endpoints": [
      "/companies",
      "/products",
      "/products/${id}",
      "/products/${editId}"
    ],
    "primaryEndpoint": "/companies",
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "products/price-change",
    "routeName": "admin__products_price_change",
    "title": "Products / Price Change",
    "file": "frontend/app/dashboards/admin/products/price-change/page.js",
    "endpoints": [
      "/products",
      "/products/${editId}"
    ],
    "primaryEndpoint": "/products",
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "quality/final-release",
    "routeName": "admin__quality_final_release",
    "title": "Quality / Final Release",
    "file": "frontend/app/dashboards/admin/quality/final-release/page.js",
    "endpoints": [],
    "primaryEndpoint": null,
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "quality/finished-goods",
    "routeName": "admin__quality_finished_goods",
    "title": "Quality / Finished Goods",
    "file": "frontend/app/dashboards/admin/quality/finished-goods/page.js",
    "endpoints": [],
    "primaryEndpoint": null,
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "quality",
    "routeName": "admin__quality",
    "title": "Quality",
    "file": "frontend/app/dashboards/admin/quality/page.js",
    "endpoints": [],
    "primaryEndpoint": null,
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "quality/production",
    "routeName": "admin__quality_production",
    "title": "Quality / Production",
    "file": "frontend/app/dashboards/admin/quality/production/page.js",
    "endpoints": [],
    "primaryEndpoint": null,
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "quality/raw-material",
    "routeName": "admin__quality_raw_material",
    "title": "Quality / Raw Material",
    "file": "frontend/app/dashboards/admin/quality/raw-material/page.js",
    "endpoints": [],
    "primaryEndpoint": null,
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "regions/add",
    "routeName": "admin__regions_add",
    "title": "Regions / Add",
    "file": "frontend/app/dashboards/admin/regions/add/page.js",
    "endpoints": [
      "/warehouses",
      "/regions"
    ],
    "primaryEndpoint": "/warehouses",
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "regions",
    "routeName": "admin__regions",
    "title": "Regions",
    "file": "frontend/app/dashboards/admin/regions/page.js",
    "endpoints": [
      "/regions?${params.toString()}",
      "/warehouses",
      "/regions/${edit._id}",
      "/regions/${id}"
    ],
    "primaryEndpoint": "/regions?${params.toString()}",
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "reports/compliance",
    "routeName": "admin__reports_compliance",
    "title": "Reports / Compliance",
    "file": "frontend/app/dashboards/admin/reports/compliance/page.js",
    "endpoints": [
      "/reports/compliance"
    ],
    "primaryEndpoint": "/reports/compliance",
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "reports/finance",
    "routeName": "admin__reports_finance",
    "title": "Reports / Finance",
    "file": "frontend/app/dashboards/admin/reports/finance/page.js",
    "endpoints": [
      "/reports/finance"
    ],
    "primaryEndpoint": "/reports/finance",
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "reports/hr",
    "routeName": "admin__reports_hr",
    "title": "Reports / Hr",
    "file": "frontend/app/dashboards/admin/reports/hr/page.js",
    "endpoints": [
      "/reports/hr"
    ],
    "primaryEndpoint": "/reports/hr",
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "reports/inventory",
    "routeName": "admin__reports_inventory",
    "title": "Reports / Inventory",
    "file": "frontend/app/dashboards/admin/reports/inventory/page.js",
    "endpoints": [
      "/reports/inventory"
    ],
    "primaryEndpoint": "/reports/inventory",
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "reports/logistics",
    "routeName": "admin__reports_logistics",
    "title": "Reports / Logistics",
    "file": "frontend/app/dashboards/admin/reports/logistics/page.js",
    "endpoints": [
      "/reports/logistics"
    ],
    "primaryEndpoint": "/reports/logistics",
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "reports",
    "routeName": "admin__reports",
    "title": "Reports",
    "file": "frontend/app/dashboards/admin/reports/page.js",
    "endpoints": [
      "/reports/overview",
      "/reports/builder?${query}"
    ],
    "primaryEndpoint": "/reports/overview",
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "reports/sales",
    "routeName": "admin__reports_sales",
    "title": "Reports / Sales",
    "file": "frontend/app/dashboards/admin/reports/sales/page.js",
    "endpoints": [
      "/reports/sales"
    ],
    "primaryEndpoint": "/reports/sales",
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "sales-kpi",
    "routeName": "admin__sales_kpi",
    "title": "Sales Kpi",
    "file": "frontend/app/dashboards/admin/sales-kpi/page.js",
    "endpoints": [
      "/sales-kpi/summary"
    ],
    "primaryEndpoint": "/sales-kpi/summary",
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "settings/change-password",
    "routeName": "admin__settings_change_password",
    "title": "Settings / Change Password",
    "file": "frontend/app/dashboards/admin/settings/change-password/page.js",
    "endpoints": [
      "/users/change-password"
    ],
    "primaryEndpoint": "/users/change-password",
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "settings",
    "routeName": "admin__settings",
    "title": "Settings",
    "file": "frontend/app/dashboards/admin/settings/page.js",
    "endpoints": [
      "/users/me",
      "/users/me"
    ],
    "primaryEndpoint": "/users/me",
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "users/add",
    "routeName": "admin__users_add",
    "title": "Users / Add",
    "file": "frontend/app/dashboards/admin/users/add/page.js",
    "endpoints": [
      "/users",
      "/warehouses",
      "/regions",
      "/zones",
      "/areas",
      "/users"
    ],
    "primaryEndpoint": "/users",
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "users",
    "routeName": "admin__users",
    "title": "Users",
    "file": "frontend/app/dashboards/admin/users/page.js",
    "endpoints": [
      "/users",
      "/warehouses",
      "/regions",
      "/zones",
      "/areas",
      "/users/${id}",
      "/users/${editUser._id}"
    ],
    "primaryEndpoint": "/users",
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "vehicle-management/add",
    "routeName": "admin__vehicle_management_add",
    "title": "Vehicle Management / Add",
    "file": "frontend/app/dashboards/admin/vehicle-management/add/page.js",
    "endpoints": [],
    "primaryEndpoint": null,
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "vehicle-management/fuel-management",
    "routeName": "admin__vehicle_management_fuel_management",
    "title": "Vehicle Management / Fuel Management",
    "file": "frontend/app/dashboards/admin/vehicle-management/fuel-management/page.js",
    "endpoints": [
      "/uploads/vehicle-proof",
      "/vehicles",
      "/vehicle-management/trips",
      "/vehicle-management/refuels",
      "/vehicle-management/trips",
      "/vehicle-management/refuels"
    ],
    "primaryEndpoint": "/uploads/vehicle-proof",
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "vehicle-management/maintenance",
    "routeName": "admin__vehicle_management_maintenance",
    "title": "Vehicle Management / Maintenance",
    "file": "frontend/app/dashboards/admin/vehicle-management/maintenance/page.js",
    "endpoints": [
      "/uploads/vehicle-proof",
      "/vehicles",
      "/vehicle-management/maintenance",
      "/vehicle-management/maintenance"
    ],
    "primaryEndpoint": "/uploads/vehicle-proof",
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "vehicle-management",
    "routeName": "admin__vehicle_management",
    "title": "Vehicle Management",
    "file": "frontend/app/dashboards/admin/vehicle-management/page.js",
    "endpoints": [
      "/vehicle-management/overview${query.toString() ? "
    ],
    "primaryEndpoint": "/vehicle-management/overview${query.toString() ? ",
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "vehicle-management/vehicles",
    "routeName": "admin__vehicle_management_vehicles",
    "title": "Vehicle Management / Vehicles",
    "file": "frontend/app/dashboards/admin/vehicle-management/vehicles/page.js",
    "endpoints": [
      "/vehicles${params.toString() ? ",
      "/users",
      "/regions",
      "/zones",
      "/areas",
      "/vehicles/${id}/detail",
      "/vehicles/${id}",
      "/vehicles/${editModal._id}"
    ],
    "primaryEndpoint": "/vehicles${params.toString() ? ",
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "warehouse-inventory",
    "routeName": "admin__warehouse_inventory",
    "title": "Warehouse Inventory",
    "file": "frontend/app/dashboards/admin/warehouse-inventory/page.js",
    "endpoints": [
      "/products",
      "/warehouses",
      "/users",
      "/regions",
      "/zones",
      "/fields?limit=500",
      "/inventory/transactions",
      "/inventory/transfers",
      "/inventory/movements",
      "/inventory/summary",
      "/inventory/low-stock",
      "/inventory/near-expiry-products",
      "/inventory/transactions",
      "/inventory/transfers",
      "/inventory/transfers/${transferId}",
      "/inventory/transfers/${transferId}",
      "/inventory/transactions/${id}/mark-read",
      "/inventory/transactions/${id}/request-status",
      "/inventory/transactions/${id}",
      "/products/${productDbId}",
      "/inventory/summary-detail?productId=${encodeURIComponent(row._id.productId)}&warehouseId=${encodeURIComponent(row._id.warehouseId)}",
      "/inventory/transactions"
    ],
    "primaryEndpoint": "/products",
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "warehouses/add",
    "routeName": "admin__warehouses_add",
    "title": "Warehouses / Add",
    "file": "frontend/app/dashboards/admin/warehouses/add/page.js",
    "endpoints": [
      "/companies",
      "/warehouses"
    ],
    "primaryEndpoint": "/companies",
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "warehouses",
    "routeName": "admin__warehouses",
    "title": "Warehouses",
    "file": "frontend/app/dashboards/admin/warehouses/page.js",
    "endpoints": [
      "/warehouses",
      "/warehouses/${id}",
      "/warehouses/${edit._id}"
    ],
    "primaryEndpoint": "/warehouses",
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "zones/add",
    "routeName": "admin__zones_add",
    "title": "Zones / Add",
    "file": "frontend/app/dashboards/admin/zones/add/page.js",
    "endpoints": [
      "/warehouses",
      "/regions",
      "/zones"
    ],
    "primaryEndpoint": "/warehouses",
    "primaryMethod": "GET"
  },
  {
    "role": "admin",
    "slug": "zones",
    "routeName": "admin__zones",
    "title": "Zones",
    "file": "frontend/app/dashboards/admin/zones/page.js",
    "endpoints": [
      "/zones?${params.toString()}",
      "/warehouses",
      "/regions",
      "/zones/${edit._id}",
      "/zones/${id}"
    ],
    "primaryEndpoint": "/zones?${params.toString()}",
    "primaryMethod": "GET"
  },
  {
    "role": "brandManager",
    "slug": "messages",
    "routeName": "brandManager__messages",
    "title": "Messages",
    "file": "frontend/app/dashboards/brandManager/messages/page.js",
    "endpoints": [],
    "primaryEndpoint": null,
    "primaryMethod": "GET"
  },
  {
    "role": "brandManager",
    "slug": "orders",
    "routeName": "brandManager__orders",
    "title": "Orders",
    "file": "frontend/app/dashboards/brandManager/orders/page.js",
    "endpoints": [],
    "primaryEndpoint": null,
    "primaryMethod": "GET"
  },
  {
    "role": "brandManager",
    "slug": "home",
    "routeName": "brandManager__home",
    "title": "brandManager Home",
    "file": "frontend/app/dashboards/brandManager/page.js",
    "endpoints": [],
    "primaryEndpoint": null,
    "primaryMethod": "GET"
  },
  {
    "role": "brandManager",
    "slug": "primary-order-request",
    "routeName": "brandManager__primary_order_request",
    "title": "Primary Order Request",
    "file": "frontend/app/dashboards/brandManager/primary-order-request/page.js",
    "endpoints": [],
    "primaryEndpoint": null,
    "primaryMethod": "GET"
  },
  {
    "role": "brandManager",
    "slug": "return-stock",
    "routeName": "brandManager__return_stock",
    "title": "Return Stock",
    "file": "frontend/app/dashboards/brandManager/return-stock/page.js",
    "endpoints": [],
    "primaryEndpoint": null,
    "primaryMethod": "GET"
  },
  {
    "role": "brandManager",
    "slug": "settings/change-password",
    "routeName": "brandManager__settings_change_password",
    "title": "Settings / Change Password",
    "file": "frontend/app/dashboards/brandManager/settings/change-password/page.js",
    "endpoints": [],
    "primaryEndpoint": null,
    "primaryMethod": "GET"
  },
  {
    "role": "brandManager",
    "slug": "settings",
    "routeName": "brandManager__settings",
    "title": "Settings",
    "file": "frontend/app/dashboards/brandManager/settings/page.js",
    "endpoints": [],
    "primaryEndpoint": null,
    "primaryMethod": "GET"
  },
  {
    "role": "cashier",
    "slug": "home",
    "routeName": "cashier__home",
    "title": "cashier Home",
    "file": "frontend/app/dashboards/cashier/page.js",
    "endpoints": [],
    "primaryEndpoint": null,
    "primaryMethod": "GET"
  },
  {
    "role": "ceo",
    "slug": "home",
    "routeName": "ceo__home",
    "title": "ceo Home",
    "file": "frontend/app/dashboards/ceo/page.js",
    "endpoints": [],
    "primaryEndpoint": null,
    "primaryMethod": "GET"
  },
  {
    "role": "customer",
    "slug": "orders",
    "routeName": "customer__orders",
    "title": "Orders",
    "file": "frontend/app/dashboards/customer/orders/page.js",
    "endpoints": [],
    "primaryEndpoint": null,
    "primaryMethod": "GET"
  },
  {
    "role": "customer",
    "slug": "home",
    "routeName": "customer__home",
    "title": "customer Home",
    "file": "frontend/app/dashboards/customer/page.js",
    "endpoints": [],
    "primaryEndpoint": null,
    "primaryMethod": "GET"
  },
  {
    "role": "customer",
    "slug": "receipts",
    "routeName": "customer__receipts",
    "title": "Receipts",
    "file": "frontend/app/dashboards/customer/receipts/page.js",
    "endpoints": [],
    "primaryEndpoint": null,
    "primaryMethod": "GET"
  },
  {
    "role": "customer",
    "slug": "settings/change-password",
    "routeName": "customer__settings_change_password",
    "title": "Settings / Change Password",
    "file": "frontend/app/dashboards/customer/settings/change-password/page.js",
    "endpoints": [],
    "primaryEndpoint": null,
    "primaryMethod": "GET"
  },
  {
    "role": "customer",
    "slug": "settings",
    "routeName": "customer__settings",
    "title": "Settings",
    "file": "frontend/app/dashboards/customer/settings/page.js",
    "endpoints": [],
    "primaryEndpoint": null,
    "primaryMethod": "GET"
  },
  {
    "role": "deliveryBoy",
    "slug": "orders",
    "routeName": "deliveryBoy__orders",
    "title": "Orders",
    "file": "frontend/app/dashboards/deliveryBoy/orders/page.js",
    "endpoints": [],
    "primaryEndpoint": null,
    "primaryMethod": "GET"
  },
  {
    "role": "deliveryBoy",
    "slug": "home",
    "routeName": "deliveryBoy__home",
    "title": "deliveryBoy Home",
    "file": "frontend/app/dashboards/deliveryBoy/page.js",
    "endpoints": [],
    "primaryEndpoint": null,
    "primaryMethod": "GET"
  },
  {
    "role": "distributor",
    "slug": "expense",
    "routeName": "distributor__expense",
    "title": "Expense",
    "file": "frontend/app/dashboards/distributor/expense/page.js",
    "endpoints": [
      "/users/me",
      "/expenses?section=distributor",
      "/expenses"
    ],
    "primaryEndpoint": "/users/me",
    "primaryMethod": "GET"
  },
  {
    "role": "distributor",
    "slug": "messages",
    "routeName": "distributor__messages",
    "title": "Messages",
    "file": "frontend/app/dashboards/distributor/messages/page.js",
    "endpoints": [],
    "primaryEndpoint": null,
    "primaryMethod": "GET"
  },
  {
    "role": "distributor",
    "slug": "orders",
    "routeName": "distributor__orders",
    "title": "Orders",
    "file": "frontend/app/dashboards/distributor/orders/page.js",
    "endpoints": [],
    "primaryEndpoint": null,
    "primaryMethod": "GET"
  },
  {
    "role": "distributor",
    "slug": "home",
    "routeName": "distributor__home",
    "title": "distributor Home",
    "file": "frontend/app/dashboards/distributor/page.js",
    "endpoints": [],
    "primaryEndpoint": null,
    "primaryMethod": "GET"
  },
  {
    "role": "distributor",
    "slug": "payments",
    "routeName": "distributor__payments",
    "title": "Payments",
    "file": "frontend/app/dashboards/distributor/payments/page.js",
    "endpoints": [],
    "primaryEndpoint": null,
    "primaryMethod": "GET"
  },
  {
    "role": "distributor",
    "slug": "payments/primary",
    "routeName": "distributor__payments_primary",
    "title": "Payments / Primary",
    "file": "frontend/app/dashboards/distributor/payments/primary/page.js",
    "endpoints": [],
    "primaryEndpoint": null,
    "primaryMethod": "GET"
  },
  {
    "role": "distributor",
    "slug": "payments/secondary",
    "routeName": "distributor__payments_secondary",
    "title": "Payments / Secondary",
    "file": "frontend/app/dashboards/distributor/payments/secondary/page.js",
    "endpoints": [],
    "primaryEndpoint": null,
    "primaryMethod": "GET"
  },
  {
    "role": "distributor",
    "slug": "primary-order-request",
    "routeName": "distributor__primary_order_request",
    "title": "Primary Order Request",
    "file": "frontend/app/dashboards/distributor/primary-order-request/page.js",
    "endpoints": [],
    "primaryEndpoint": null,
    "primaryMethod": "GET"
  },
  {
    "role": "distributor",
    "slug": "receipts",
    "routeName": "distributor__receipts",
    "title": "Receipts",
    "file": "frontend/app/dashboards/distributor/receipts/page.js",
    "endpoints": [],
    "primaryEndpoint": null,
    "primaryMethod": "GET"
  },
  {
    "role": "distributor",
    "slug": "return-stock",
    "routeName": "distributor__return_stock",
    "title": "Return Stock",
    "file": "frontend/app/dashboards/distributor/return-stock/page.js",
    "endpoints": [],
    "primaryEndpoint": null,
    "primaryMethod": "GET"
  },
  {
    "role": "distributor",
    "slug": "settings/change-password",
    "routeName": "distributor__settings_change_password",
    "title": "Settings / Change Password",
    "file": "frontend/app/dashboards/distributor/settings/change-password/page.js",
    "endpoints": [],
    "primaryEndpoint": null,
    "primaryMethod": "GET"
  },
  {
    "role": "distributor",
    "slug": "settings",
    "routeName": "distributor__settings",
    "title": "Settings",
    "file": "frontend/app/dashboards/distributor/settings/page.js",
    "endpoints": [],
    "primaryEndpoint": null,
    "primaryMethod": "GET"
  },
  {
    "role": "fieldSM",
    "slug": "home",
    "routeName": "fieldSM__home",
    "title": "fieldSM Home",
    "file": "frontend/app/dashboards/fieldSM/page.js",
    "endpoints": [],
    "primaryEndpoint": null,
    "primaryMethod": "GET"
  },
  {
    "role": "hrAssistant",
    "slug": "home",
    "routeName": "hrAssistant__home",
    "title": "hrAssistant Home",
    "file": "frontend/app/dashboards/hrAssistant/page.js",
    "endpoints": [],
    "primaryEndpoint": null,
    "primaryMethod": "GET"
  },
  {
    "role": "kpo",
    "slug": "home",
    "routeName": "kpo__home",
    "title": "kpo Home",
    "file": "frontend/app/dashboards/kpo/page.js",
    "endpoints": [],
    "primaryEndpoint": null,
    "primaryMethod": "GET"
  },
  {
    "role": "manageDirector",
    "slug": "home",
    "routeName": "manageDirector__home",
    "title": "manageDirector Home",
    "file": "frontend/app/dashboards/manageDirector/page.js",
    "endpoints": [],
    "primaryEndpoint": null,
    "primaryMethod": "GET"
  },
  {
    "role": "nationalSM",
    "slug": "home",
    "routeName": "nationalSM__home",
    "title": "nationalSM Home",
    "file": "frontend/app/dashboards/nationalSM/page.js",
    "endpoints": [],
    "primaryEndpoint": null,
    "primaryMethod": "GET"
  },
  {
    "role": "orderBooker",
    "slug": "orders",
    "routeName": "orderBooker__orders",
    "title": "Orders",
    "file": "frontend/app/dashboards/orderBooker/orders/page.js",
    "endpoints": [],
    "primaryEndpoint": null,
    "primaryMethod": "GET"
  },
  {
    "role": "orderBooker",
    "slug": "home",
    "routeName": "orderBooker__home",
    "title": "orderBooker Home",
    "file": "frontend/app/dashboards/orderBooker/page.js",
    "endpoints": [],
    "primaryEndpoint": null,
    "primaryMethod": "GET"
  },
  {
    "role": "orderBooker",
    "slug": "receipts",
    "routeName": "orderBooker__receipts",
    "title": "Receipts",
    "file": "frontend/app/dashboards/orderBooker/receipts/page.js",
    "endpoints": [],
    "primaryEndpoint": null,
    "primaryMethod": "GET"
  },
  {
    "role": "regionalSM",
    "slug": "home",
    "routeName": "regionalSM__home",
    "title": "regionalSM Home",
    "file": "frontend/app/dashboards/regionalSM/page.js",
    "endpoints": [],
    "primaryEndpoint": null,
    "primaryMethod": "GET"
  },
  {
    "role": "salesman",
    "slug": "orders",
    "routeName": "salesman__orders",
    "title": "Orders",
    "file": "frontend/app/dashboards/salesman/orders/page.js",
    "endpoints": [],
    "primaryEndpoint": null,
    "primaryMethod": "GET"
  },
  {
    "role": "salesman",
    "slug": "home",
    "routeName": "salesman__home",
    "title": "salesman Home",
    "file": "frontend/app/dashboards/salesman/page.js",
    "endpoints": [],
    "primaryEndpoint": null,
    "primaryMethod": "GET"
  },
  {
    "role": "territorySM",
    "slug": "home",
    "routeName": "territorySM__home",
    "title": "territorySM Home",
    "file": "frontend/app/dashboards/territorySM/page.js",
    "endpoints": [],
    "primaryEndpoint": null,
    "primaryMethod": "GET"
  },
  {
    "role": "warehouseManager",
    "slug": "order-management",
    "routeName": "warehouseManager__order_management",
    "title": "Order Management",
    "file": "frontend/app/dashboards/warehouseManager/order-management/page.js",
    "endpoints": [],
    "primaryEndpoint": null,
    "primaryMethod": "GET"
  },
  {
    "role": "warehouseManager",
    "slug": "orders",
    "routeName": "warehouseManager__orders",
    "title": "Orders",
    "file": "frontend/app/dashboards/warehouseManager/orders/page.js",
    "endpoints": [],
    "primaryEndpoint": null,
    "primaryMethod": "GET"
  },
  {
    "role": "warehouseManager",
    "slug": "home",
    "routeName": "warehouseManager__home",
    "title": "warehouseManager Home",
    "file": "frontend/app/dashboards/warehouseManager/page.js",
    "endpoints": [],
    "primaryEndpoint": null,
    "primaryMethod": "GET"
  },
  {
    "role": "warehouseManager",
    "slug": "payments",
    "routeName": "warehouseManager__payments",
    "title": "Payments",
    "file": "frontend/app/dashboards/warehouseManager/payments/page.js",
    "endpoints": [],
    "primaryEndpoint": null,
    "primaryMethod": "GET"
  },
  {
    "role": "warehouseManager",
    "slug": "payments/primary",
    "routeName": "warehouseManager__payments_primary",
    "title": "Payments / Primary",
    "file": "frontend/app/dashboards/warehouseManager/payments/primary/page.js",
    "endpoints": [],
    "primaryEndpoint": null,
    "primaryMethod": "GET"
  },
  {
    "role": "warehouseManager",
    "slug": "payments/secondary",
    "routeName": "warehouseManager__payments_secondary",
    "title": "Payments / Secondary",
    "file": "frontend/app/dashboards/warehouseManager/payments/secondary/page.js",
    "endpoints": [],
    "primaryEndpoint": null,
    "primaryMethod": "GET"
  },
  {
    "role": "warehouseManager",
    "slug": "warehouse-inventory",
    "routeName": "warehouseManager__warehouse_inventory",
    "title": "Warehouse Inventory",
    "file": "frontend/app/dashboards/warehouseManager/warehouse-inventory/page.js",
    "endpoints": [],
    "primaryEndpoint": null,
    "primaryMethod": "GET"
  },
  {
    "role": "zoneSM",
    "slug": "home",
    "routeName": "zoneSM__home",
    "title": "zoneSM Home",
    "file": "frontend/app/dashboards/zoneSM/page.js",
    "endpoints": [],
    "primaryEndpoint": null,
    "primaryMethod": "GET"
  }
];
