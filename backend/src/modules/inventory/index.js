const routes = {
  inventory: require("../../routes/inventory"),
};
const models = {
  InventoryLedger: require("../../models/InventoryLedger"),
  StockTransfer: require("../../models/StockTransfer"),
  DistributorStockReceipt: require("../../models/DistributorStockReceipt"),
  Product: require("../../models/Product"),
};
module.exports = { routes, models };
