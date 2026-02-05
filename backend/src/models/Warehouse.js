const mongoose = require("mongoose");

const WarehouseSchema = new mongoose.Schema(
  {
    warehouseId: { type: String, required: true, trim: true, unique: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    region: { type: String, trim: true },
    managerName: { type: String, trim: true },
    capacity: { type: Number, default: 0 },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    companyId: { type: String, trim: true },
    companyName: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Warehouse", WarehouseSchema);