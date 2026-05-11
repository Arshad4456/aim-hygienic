const { APP_BRAND } = require("../config/brand");

function registerRoutes(app) {
  app.use("/api/companies", require("./companies"));
  app.use("/api/company-branches", require("./companyBranches"));
  app.use("/api/users", require("./users"));
  app.use("/api/warehouse", require("../core/common-modules/warehouse/warehouse.routes"));
  app.use("/api/warehouses", require("./warehouses"));
  app.use("/api/regions", require("./regions"));
  app.use("/api/zones", require("./zones"));
  app.use("/api/fields", require("./fields"));
  app.use("/api/areas", require("./areas"));
  app.use("/api/territory", require("../erp/distribution/modules/territory/territory.routes"));
  app.use("/api/procurement", require("../core/supply-chain/modules/procurement/procurement.routes"));
  app.use("/api/vehicles", require("./vehicles"));
  app.use("/api/products", require("./products"));
  app.use("/api/inventory", require("../core/supply-chain/modules/inventory/inventory.routes"));
  app.use("/api/inventory", require("./inventory"));
  app.use("/api/messages", require("./messages"));
  app.use("/api/notifications", require("../core/messaging/modules/notifications/notifications.routes"));
  app.use("/api/expenses", require("./expenses"));
  app.use("/api/accounts", require("./accounts"));
  app.use("/api/finance", require("../core/finance/modules/finance/finance.routes"));
  app.use("/api/logistics", require("../erp/logistics/modules/logistics/logistics.routes"));
  app.use("/api/operations", require("../erp/distribution/modules/operations/operations.routes"));
  app.use("/api/reports", require("./reports"));
  app.use("/api/live-tracking", require("./liveTracking"));
  app.use("/api/dashboard", require("./dashboard"));
  app.use("/api/sales-kpi", require("./salesKpi"));
  app.use("/api/sales", require("../core/supply-chain/modules/sales/sales.routes"));
  app.use("/api/retail-pos", require("../erp/retail-pos/modules/pos/retail-pos.routes"));
  app.use("/api/manufacturing", require("../erp/manufacturing/modules/production/manufacturing.routes"));
  app.use("/api/service", require("../erp/service-business/modules/service-orders/service.routes"));
  app.use("/api/trading", require("../erp/trading/modules/trading-shipments/trading.routes"));
  app.use("/api/orders", require("./orders"));
  app.use("/api/returns", require("./returns"));
  app.use("/api/payments", require("./payments"));
  app.use("/api/uploads", require("./uploads"));
  app.use("/api/loans", require("./loans"));
  app.use("/api/receipts", require("./receipts"));
  app.use("/api/vehicle-management", require("./vehicleManagement"));
  app.use("/api/location", require("./location"));
  app.use("/api/module-access", require("./moduleAccess"));

  app.use("/api/erp-templates", require("../core/erp-templates/erpTemplate.routes"));
  app.use("/api/subscriptions", require("../core/subscriptions/subscription.routes"));
  app.use("/api/roles", require("../core/roles/role.routes"));
  app.use("/api/portal-modules", require("../core/portal-modules/portalModule.routes"));
  app.use("/api/user-access", require("../core/user-access/userAccess.routes"));
  app.use("/api/system-admin", require("../core/system-admin/systemAdmin.routes"));
  app.use("/api/company-control", require("../core/company-control/companyControl.routes"));
  app.use("/api/settings", require("../core/settings/settings.routes"));

  app.use("/api/health", require("./health"));
  app.use("/api/auth", require("./auth"));
  app.use("/api/admin/users", require("./adminUsers"));
}
module.exports = { registerRoutes };
