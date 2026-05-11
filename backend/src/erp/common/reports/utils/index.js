const routes = {
  reports: require("../routes/reports.routes"),
  dashboard: require("../../dashboard/routes/dashboard.routes"),
  salesKpi: require("../../../distribution/reports/routes/sales-kpi.routes"),
};
const models = {

};
module.exports = { routes, models };
