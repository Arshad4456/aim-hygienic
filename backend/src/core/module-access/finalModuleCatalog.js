const moduleRegistry = require("./moduleRegistry");
const FINAL_RAWYAN_MODULES = moduleRegistry.map((module) => module.key);
const FINAL_RAWYAN_SUPPLY_CHAIN = {
  distribution: ["supplier", "company", "company_warehouse", "distributor", "customer"],
  primarySales: "company_to_distributor",
  secondarySales: "distributor_to_customer",
};
module.exports = { FINAL_RAWYAN_MODULES, FINAL_RAWYAN_SUPPLY_CHAIN };
