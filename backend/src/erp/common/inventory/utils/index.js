const routes = {
  inventory: require("../routes/inventory.routes"),
};
const models = {
  InventoryLedger: require("../models/InventoryLedger"),
  StockTransfer: require("../models/StockTransfer"),
  DistributorStockReceipt: require("../../../distribution/sales/models/DistributorStockReceipt"),
  Product: require("../../products/models/Product"),
};
module.exports = { routes, models };
