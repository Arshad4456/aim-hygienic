const routes = {
  regions: require("../../routes/regions"),
  zones: require("../../routes/zones"),
  areas: require("../../routes/areas"),
  fields: require("../../routes/fields"),
};
const models = {
  Region: require("../../models/Region"),
  Zone: require("../../models/Zone"),
  Area: require("../../models/Area"),
  Field: require("../../models/Field"),
};
module.exports = { routes, models };
