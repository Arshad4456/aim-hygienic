const routes = {
  orders: require("../../routes/orders"),
  payments: require("../../routes/payments"),
};
const models = {
  SupplierInvoice: require("../../models/SupplierInvoice"),
  SupplierPayment: require("../../models/SupplierPayment"),
  GoodsReceipt: require("../../models/GoodsReceipt"),
};
module.exports = { routes, models };
