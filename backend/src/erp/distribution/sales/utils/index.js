const routes = {
  orders: require("../routes/orders.routes"),
  salesKpi: require("../../reports/routes/sales-kpi.routes"),
};
const models = {
  CompanySalesOrder: require("../models/CompanySalesOrder"),
  SecondaryOrder: require("../models/SecondaryOrder"),
  CompanyInvoiceToDistributor: require("../../../common/finance/models/CompanyInvoiceToDistributor"),
  CustomerInvoice: require("../../../common/finance/models/CustomerInvoice"),
};
module.exports = { routes, models };
