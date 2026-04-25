const routes = {
  vehicles: require("../../routes/vehicles"),
  vehicleManagement: require("../../routes/vehicleManagement"),
};
const models = {
  Vehicle: require("../../models/Vehicle"),
  VehicleAssignment: require("../../models/VehicleAssignment"),
  VehicleMaintenance: require("../../models/VehicleMaintenance"),
  VehicleRefuel: require("../../models/VehicleRefuel"),
  VehicleTrip: require("../../models/VehicleTrip"),
};
module.exports = { routes, models };
