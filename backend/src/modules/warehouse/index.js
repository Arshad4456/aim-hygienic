const routes = {
  warehouses: require("../../routes/warehouses"),
};
const models = {
  Warehouse: require("../../models/Warehouse"),
  GoodsReceipt: require("../../models/GoodsReceipt"),
  CompanyDispatchNote: require("../../models/CompanyDispatchNote"),
};
module.exports = { routes, models };
