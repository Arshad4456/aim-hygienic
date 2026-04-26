function registerRoutes(app) {
  app.use("/api/companies", require("./companies"));
  app.use("/api/company-branches", require("./companyBranches"));
  app.use("/api/users", require("./users"));
  app.use("/api/warehouse", require("../modules/warehouse/warehouse.routes"));
  app.use("/api/warehouses", require("./warehouses"));
  app.use("/api/regions", require("./regions"));
  app.use("/api/zones", require("./zones"));
  app.use("/api/fields", require("./fields"));
  app.use("/api/areas", require("./areas"));
  app.use("/api/territory", require("../modules/territory/territory.routes"));
  app.use("/api/procurement", require("../modules/procurement/procurement.routes"));
  app.use("/api/vehicles", require("./vehicles"));
  app.use("/api/products", require("./products"));
  app.use("/api/inventory", require("../modules/inventory/inventory.routes"));
  app.use("/api/inventory", require("./inventory"));
  app.use("/api/messages", require("./messages"));
  app.use("/api/expenses", require("./expenses"));
  app.use("/api/accounts", require("./accounts"));
  app.use("/api/finance", require("../modules/finance/finance.routes"));
  app.use("/api/logistics", require("../modules/logistics/logistics.routes"));
  app.use("/api/operations", require("../modules/operations/operations.routes"));
  app.use("/api/reports", require("./reports"));
  app.use("/api/live-tracking", require("./liveTracking"));
  app.use("/api/dashboard", require("./dashboard"));
  app.use("/api/sales-kpi", require("./salesKpi"));
  app.use("/api/sales", require("../modules/sales/sales.routes"));
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

  app.get("/api/health", (req, res) => res.json({ ok: true, service: "rawyan-erp-api", name: "Rawyan ERP", time: new Date().toISOString() }));
  app.use("/api/auth", require("./auth"));
  app.use("/api/admin/users", require("./adminUsers"));
}
module.exports = { registerRoutes };
