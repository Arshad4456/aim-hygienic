module.exports = {
  routes: require("./notifications.routes"),
  service: require("./notifications.service"),
  models: {
    Notification: require("../../../notifications/notification.model"),
  },
};
