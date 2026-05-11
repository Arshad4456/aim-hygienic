const routes = {
  orders: require("../../../../routes/orders"),
  salesKpi: require("../../../../routes/salesKpi"),
};
const models = {
  CompanySalesOrder: require("../../../../models/CompanySalesOrder"),
  SecondaryOrder: require("../../../../models/SecondaryOrder"),
  CompanyInvoiceToDistributor: require("../../../../models/CompanyInvoiceToDistributor"),
  CustomerInvoice: require("../../../../models/CustomerInvoice"),
};
module.exports = { routes, models };
