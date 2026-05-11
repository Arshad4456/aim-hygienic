const routes = {
  warehouses: require("../routes/warehouses.routes"),
};
const models = {
  Warehouse: require("../models/Warehouse"),
  GoodsReceipt: require("../../procurement/models/GoodsReceipt"),
  CompanyDispatchNote: require("../../../distribution/sales/models/CompanyDispatchNote"),
};
module.exports = { routes, models };
