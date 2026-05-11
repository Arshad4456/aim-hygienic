const routes = {
  vehicleManagement: require("../../fleet/routes/vehicle-management.routes"),
  uploads: require("../../../common/files/routes/uploads.routes"),
};
const models = {
  VehicleTrip: require("../../fleet/models/VehicleTrip"),
  VehicleAssignment: require("../../fleet/models/VehicleAssignment"),
};
module.exports = { routes, models };
