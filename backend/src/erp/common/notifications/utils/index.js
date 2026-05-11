module.exports = {
  routes: require("../routes/notifications.routes"),
  service: require("../services/notifications.service"),
  models: {
    Notification: require("../models/notification.model"),
  },
};
