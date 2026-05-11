const routes = {
  accounts: require("../routes/accounts.routes"),
  payments: require("../routes/payments.routes"),
  receipts: require("../routes/receipts.routes"),
};
const models = {
  Account: require("../models/Account"),
  AccountTransaction: require("../models/AccountTransaction"),
  AccountAuditLog: require("../models/AccountAuditLog"),
  CustomerReceipt: require("../models/CustomerReceipt"),
  CompanyReceiptFromDistributor: require("../models/CompanyReceiptFromDistributor"),
};
module.exports = { routes, models };
