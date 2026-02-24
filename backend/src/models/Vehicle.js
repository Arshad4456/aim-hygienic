const mongoose = require("mongoose");

const VehicleSchema = new mongoose.Schema(
  {
    vehicleId: { type: String, trim: true, unique: true, sparse: true },
    type: { type: String, required: true, trim: true },
    make: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },
    year: { type: Number, required: true },
    nickname: { type: String, trim: true },
    registrationNo: { type: String, required: true, trim: true, unique: true },
    engineNo: { type: String, required: true, trim: true, unique: true },
    chassisNo: { type: String, required: true, trim: true, unique: true },
    color: { type: String, trim: true },
    ownershipType: { type: String, enum: ["company", "leased", "employee"], default: "company" },
    purchaseDate: { type: Date },
    purchasePrice: { type: Number, default: 0 },
    insuranceProvider: { type: String, trim: true },
    insuranceExpiry: { type: Date },
    tokenExpiry: { type: Date },
    fitnessExpiry: { type: Date },
    permitExpiry: { type: Date },
    docsUrls: [{ type: String }],
    regionId: { type: String, trim: true, required: true },
    regionName: { type: String, trim: true },
    zoneId: { type: String, trim: true, required: true },
    zoneName: { type: String, trim: true },
    areaId: { type: String, trim: true, required: true },
    areaName: { type: String, trim: true },
    fieldId: { type: String, trim: true },
    fieldName: { type: String, trim: true },
    assignedUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    assignedUserName: { type: String, trim: true },
    assignmentStartDate: { type: Date },
    defaultDriverName: { type: String, trim: true },
    fuelType: { type: String, enum: ["Petrol", "Diesel", "CNG", "Hybrid", "Electric"], required: true },
    tankCapacity: { type: Number, default: 0 },
    odometerUnit: { type: String, default: "KM" },
    currentOdometer: { type: Number, required: true },
    expectedKmPerLiter: { type: Number, default: 0 },
    status: { type: String, enum: ["Active", "Inactive", "Under Maintenance", "Sold"], default: "Active" },
    notes: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

VehicleSchema.index({ type: 1, fuelType: 1, status: 1 });
VehicleSchema.index({ regionId: 1, zoneId: 1, areaId: 1 });

module.exports = mongoose.model("Vehicle", VehicleSchema);
