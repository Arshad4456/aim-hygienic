const mongoose = require("mongoose");

const RegionSchema = new mongoose.Schema(
  {
    regionId: { type: String, required: true, trim: true, unique: true },
    name: { type: String, required: true, trim: true },
    companyId: { type: String, trim: true },
    companyName: { type: String, trim: true },
    gpsLatitude: { type: String, trim: true },
    gpsLongitude: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Region", RegionSchema);
