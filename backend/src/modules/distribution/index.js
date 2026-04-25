const routes = {
  orders: require("../../routes/orders"),
  receipts: require("../../routes/receipts"),
  payments: require("../../routes/payments"),
};
const models = {
  DistributorStockReceipt: require("../../models/DistributorStockReceipt"),
  CompanyReceiptFromDistributor: require("../../models/CompanyReceiptFromDistributor"),
  SecondaryOrder: require("../../models/SecondaryOrder"),
};
module.exports = { routes, models };
