const routes = {
  vehicleManagement: require("../../../../routes/vehicleManagement"),
  uploads: require("../../../../routes/uploads"),
};
const models = {
  VehicleTrip: require("../../../../models/VehicleTrip"),
  VehicleAssignment: require("../../../../models/VehicleAssignment"),
};
module.exports = { routes, models };
