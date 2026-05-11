const routes = {
  vehicles: require("../routes/vehicles.routes"),
  vehicleManagement: require("../routes/vehicle-management.routes"),
};
const models = {
  Vehicle: require("../models/Vehicle"),
  VehicleAssignment: require("../models/VehicleAssignment"),
  VehicleMaintenance: require("../models/VehicleMaintenance"),
  VehicleRefuel: require("../models/VehicleRefuel"),
  VehicleTrip: require("../models/VehicleTrip"),
};
module.exports = { routes, models };
