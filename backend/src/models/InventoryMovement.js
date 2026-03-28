const mongoose = require("mongoose");

const InventoryMovementSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true, trim: true },
    productName: { type: String, trim: true },
    warehouseId: { type: String, required: true, trim: true },
    warehouseName: { type: String, trim: true },
    regionId: { type: String, trim: true },
    regionName: { type: String, trim: true },
    zoneId: { type: String, trim: true },
    zoneName: { type: String, trim: true },
    areaId: { type: String, trim: true },
    areaName: { type: String, trim: true },
    companyId: { type: String, trim: true },
    companyName: { type: String, trim: true },
    movementScope: {
      type: String,
      enum: ["warehouse", "region", "zone", "area"],
      default: "warehouse",
    },
    quantity: { type: Number, required: true },
    movementType: {
      type: String,
      required: true,
      enum: [
        "PURCHASE_IN",
        "TRANSFER_IN",
        "TRANSFER_OUT",
        "SALE_OUT",
        "RETURN_IN",
        "ADJUSTMENT",
      ],
    },
    referenceId: { type: String, trim: true },
    batchManufactureDate: { type: Date },
    batchExpiryDate: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("InventoryMovement", InventoryMovementSchema);