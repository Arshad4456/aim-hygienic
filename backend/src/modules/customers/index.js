const routes = {
  users: require("../../routes/users"),
  receipts: require("../../routes/receipts"),
};
const models = {
  CustomerInvoice: require("../../models/CustomerInvoice"),
  CustomerReceipt: require("../../models/CustomerReceipt"),
};
module.exports = { routes, models };
