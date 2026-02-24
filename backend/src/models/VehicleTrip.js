const mongoose = require("mongoose");

const VehicleTripSchema = new mongoose.Schema(
  {
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tripType: { type: String, enum: ["company", "personal"], required: true },
    tripDate: { type: Date, required: true, index: true },
    fromPlace: { type: String, required: true, trim: true },
    toPlace: { type: String, required: true, trim: true },
    startOdometer: { type: Number, required: true },
    endOdometer: { type: Number, required: true },
    distance: { type: Number, required: true },
    startMeterUrl: { type: String, required: true, trim: true },
    endMeterUrl: { type: String, required: true, trim: true },
    fuelEntryType: { type: String, enum: ["none", "consumed", "refilled"], default: "none" },
    liters: { type: Number, default: 0 },
    fuelReceiptUrl: { type: String, trim: true },
    notes: { type: String, trim: true },
    anomalyFlags: [{ type: String }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("VehicleTrip", VehicleTripSchema);
