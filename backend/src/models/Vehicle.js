const mongoose = require("mongoose");

const VehicleSchema = new mongoose.Schema(
  {
    vehicleId: { type: String, required: true, trim: true, unique: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, trim: true },
    plateNumber: { type: String, trim: true },
    driverId: { type: String, trim: true },
    driverName: { type: String, trim: true },
    deliveryCapacity: { type: Number, default: 0 },
    attachLevel: { type: String, enum: ["warehouse", "region", "zone", "area"], default: "warehouse" },
    warehouseId: { type: String, trim: true },
    warehouseName: { type: String, trim: true },
    regionId: { type: String, trim: true },
    regionName: { type: String, trim: true },
    zoneId: { type: String, trim: true },
    zoneName: { type: String, trim: true },
    areaId: { type: String, trim: true },
    areaName: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Vehicle", VehicleSchema);