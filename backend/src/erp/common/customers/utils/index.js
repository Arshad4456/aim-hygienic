const routes = {
  users: require("../../../platform/users/routes/users.routes"),
  receipts: require("../../finance/routes/receipts.routes"),
};
const models = {
  CustomerInvoice: require("../../finance/models/CustomerInvoice"),
  CustomerReceipt: require("../../finance/models/CustomerReceipt"),
};
module.exports = { routes, models };
