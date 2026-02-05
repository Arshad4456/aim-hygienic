const mongoose = require("mongoose");

const InventoryMovementSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true, trim: true },
    productName: { type: String, trim: true },
    warehouseId: { type: String, required: true, trim: true },
    warehouseName: { type: String, trim: true },
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
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("InventoryMovement", InventoryMovementSchema);