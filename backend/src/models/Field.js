const mongoose = require("mongoose");

const FieldSchema = new mongoose.Schema(
  {
    fieldId: { type: String, required: true, trim: true, unique: true },
    name: { type: String, required: true, trim: true },
    companyId: { type: String, trim: true },
    companyName: { type: String, trim: true },
    warehouseId: { type: String, trim: true },
    warehouseName: { type: String, trim: true },
    regionId: { type: String, trim: true },
    regionName: { type: String, trim: true },
    zoneId: { type: String, trim: true },
    zoneName: { type: String, trim: true },
    territoryId: { type: String, trim: true },
    territoryName: { type: String, trim: true },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Field", FieldSchema);