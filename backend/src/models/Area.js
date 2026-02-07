const mongoose = require("mongoose");

const AreaSchema = new mongoose.Schema(
  {
    areaId: { type: String, required: true, trim: true, unique: true },
    name: { type: String, required: true, trim: true },
    warehouseId: { type: String, trim: true },
    warehouseName: { type: String, trim: true },
    regionId: { type: String, trim: true },
    regionName: { type: String, trim: true },
    zoneId: { type: String, trim: true },
    zoneName: { type: String, trim: true },
    gpsLatitude: { type: String, trim: true },
    gpsLongitude: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Area", AreaSchema);