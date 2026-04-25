const routes = {
  users: require("../../routes/users"),
  adminUsers: require("../../routes/adminUsers"),
};
const models = {
  User: require("../../models/User"),
};
module.exports = { routes, models };
