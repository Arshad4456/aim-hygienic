const routes = {
  regions: require("../routes/regions.routes"),
  zones: require("../routes/zones.routes"),
  areas: require("../routes/areas.routes"),
  fields: require("../routes/fields.routes"),
};
const models = {
  Region: require("../models/Region"),
  Zone: require("../models/Zone"),
  Area: require("../models/Area"),
  Field: require("../models/Field"),
};
module.exports = { routes, models };
