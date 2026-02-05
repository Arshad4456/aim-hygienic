const mongoose = require("mongoose");

const VehicleSchema = new mongoose.Schema(
  {
    vehicleId: { type: String, required: true, trim: true, unique: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, trim: true },
    plateNumber: { type: String, trim: true },
    driverId: { type: String, trim: true },
    driverName: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Vehicle", VehicleSchema);