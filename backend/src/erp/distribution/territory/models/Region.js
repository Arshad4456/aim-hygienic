const mongoose = require("mongoose");

const RegionSchema = new mongoose.Schema(
  {
    regionId: { type: String, required: true, trim: true, unique: true },
    name: { type: String, required: true, trim: true },
    companyId: { type: String, trim: true },
    companyName: { type: String, trim: true },
    warehouseId: { type: String, trim: true },
    warehouseName: { type: String, trim: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    gpsLatitude: { type: String, trim: true },
    gpsLongitude: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Region", RegionSchema);