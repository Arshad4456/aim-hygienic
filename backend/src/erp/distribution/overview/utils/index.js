const routes = {
  orders: require("../../sales/routes/orders.routes"),
  receipts: require("../../../common/finance/routes/receipts.routes"),
  payments: require("../../../common/finance/routes/payments.routes"),
};
const models = {
  DistributorStockReceipt: require("../../sales/models/DistributorStockReceipt"),
  CompanyReceiptFromDistributor: require("../../../common/finance/models/CompanyReceiptFromDistributor"),
  SecondaryOrder: require("../../sales/models/SecondaryOrder"),
};
module.exports = { routes, models };
