const { APP_BRAND } = require("./config/brand");

function registerRoutes(app) {
  app.use("/api/companies", require("./erp/platform/companies/routes/companies.routes"));
  app.use("/api/company-branches", require("./erp/platform/companies/routes/company-branches.routes"));
  app.use("/api/users", require("./erp/platform/users/routes/users.routes"));
  app.use("/api/warehouse", require("./erp/common/warehouse/routes/warehouse.routes"));
  app.use("/api/warehouses", require("./erp/common/warehouse/routes/warehouses.routes"));
  app.use("/api/regions", require("./erp/distribution/territory/routes/regions.routes"));
  app.use("/api/zones", require("./erp/distribution/territory/routes/zones.routes"));
  app.use("/api/fields", require("./erp/distribution/territory/routes/fields.routes"));
  app.use("/api/areas", require("./erp/distribution/territory/routes/areas.routes"));
  app.use("/api/territory", require("./erp/distribution/territory/routes/territory.routes"));
  app.use("/api/procurement", require("./erp/common/procurement/routes/procurement.routes"));
  app.use("/api/vehicles", require("./erp/logistics/fleet/routes/vehicles.routes"));
  app.use("/api/products", require("./erp/common/products/routes/products.routes"));
  app.use("/api/inventory", require("./erp/common/inventory/routes/inventory-inventory.routes"));
  app.use("/api/inventory", require("./erp/common/inventory/routes/inventory.routes"));
  app.use("/api/messages", require("./erp/common/messaging/routes/messages.routes"));
  app.use("/api/notifications", require("./erp/common/notifications/routes/notifications.routes"));
  app.use("/api/expenses", require("./erp/common/finance/routes/expenses.routes"));
  app.use("/api/accounts", require("./erp/common/finance/routes/accounts.routes"));
  app.use("/api/finance", require("./erp/common/finance/routes/finance.routes"));
  app.use("/api/logistics", require("./erp/logistics/operations/routes/logistics.routes"));
  app.use("/api/operations", require("./erp/common/operations/routes/operations.routes"));
  app.use("/api/reports", require("./erp/common/reports/routes/reports.routes"));
  app.use("/api/live-tracking", require("./erp/logistics/live-tracking/routes/live-tracking.routes"));
  app.use("/api/dashboard", require("./erp/common/dashboard/routes/dashboard.routes"));
  app.use("/api/sales-kpi", require("./erp/distribution/reports/routes/sales-kpi.routes"));
  app.use("/api/sales", require("./erp/distribution/sales/routes/sales.routes"));
  app.use("/api/retail-pos", require("./erp/retail-pos/pos/routes/retail-pos.routes"));
  app.use("/api/manufacturing", require("./erp/manufacturing/production/routes/manufacturing.routes"));
  app.use("/api/service", require("./erp/service-business/work-orders/routes/service.routes"));
  app.use("/api/trading", require("./erp/trading/import-export/routes/trading.routes"));
  app.use("/api/orders", require("./erp/distribution/sales/routes/orders.routes"));
  app.use("/api/returns", require("./erp/common/returns/routes/returns.routes"));
  app.use("/api/payments", require("./erp/common/finance/routes/payments.routes"));
  app.use("/api/uploads", require("./erp/common/files/routes/uploads.routes"));
  app.use("/api/loans", require("./erp/common/finance/routes/loans.routes"));
  app.use("/api/receipts", require("./erp/common/finance/routes/receipts.routes"));
  app.use("/api/vehicle-management", require("./erp/logistics/fleet/routes/vehicle-management.routes"));
  app.use("/api/location", require("./erp/logistics/live-tracking/routes/location.routes"));
  app.use("/api/module-access", require("./erp/platform/access/routes/module-access.routes"));

  app.use("/api/erp-templates", require("./erp/platform/erp-types/routes/erpTemplate.routes"));
  app.use("/api/subscriptions", require("./erp/platform/subscriptions/routes/subscription.routes"));
  app.use("/api/roles", require("./erp/platform/roles/routes/role.routes"));
  app.use("/api/portal-modules", require("./erp/platform/portal-modules/routes/portalModule.routes"));
  app.use("/api/user-access", require("./erp/platform/user-access/routes/userAccess.routes"));
  app.use("/api/system-admin", require("./erp/platform/system-admin/routes/systemAdmin.routes"));
  app.use("/api/company-control", require("./erp/platform/companies/routes/companyControl.routes"));
  app.use("/api/settings", require("./erp/platform/settings/routes/settings.routes"));

  app.use("/api/health", require("./erp/platform/health/routes/health.routes"));
  app.use("/api/auth", require("./erp/platform/auth/routes/auth.routes"));
  app.use("/api/admin/users", require("./erp/platform/users/routes/admin-users.routes"));
}
module.exports = { registerRoutes };
