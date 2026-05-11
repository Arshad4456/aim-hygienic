const routes = {
  expenses: require("../routes/expenses.routes"),
};
const models = {
  Expense: require("../models/Expense"),
};
module.exports = { routes, models };
