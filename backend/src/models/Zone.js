const mongoose = require("mongoose");

const ZoneSchema = new mongoose.Schema(
  {
    zoneId: { type: String, required: true, trim: true, unique: true },
    name: { type: String, required: true, trim: true },
    companyId: { type: String, trim: true },
    companyName: { type: String, trim: true },
    warehouseId: { type: String, trim: true },
    warehouseName: { type: String, trim: true },
    regionId: { type: String, trim: true },
    regionName: { type: String, trim: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    gpsLatitude: { type: String, trim: true },
    gpsLongitude: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Zone", ZoneSchema);
