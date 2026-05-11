const routes = {
  accounts: require("../../../../routes/accounts"),
  payments: require("../../../../routes/payments"),
  receipts: require("../../../../routes/receipts"),
};
const models = {
  Account: require("../../../../models/Account"),
  AccountTransaction: require("../../../../models/AccountTransaction"),
  AccountAuditLog: require("../../../../models/AccountAuditLog"),
  CustomerReceipt: require("../../../../models/CustomerReceipt"),
  CompanyReceiptFromDistributor: require("../../../../models/CompanyReceiptFromDistributor"),
};
module.exports = { routes, models };
