const routes = {
  users: require("../routes/users.routes"),
  adminUsers: require("../routes/admin-users.routes"),
};
const models = {
  User: require("../models/User"),
};
module.exports = { routes, models };
