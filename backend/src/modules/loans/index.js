const routes = {
  loans: require("../../routes/loans"),
};
const models = {
  Loan: require("../../models/Loan"),
  LoanPayment: require("../../models/LoanPayment"),
};
module.exports = { routes, models };
