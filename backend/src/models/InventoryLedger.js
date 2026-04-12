const mongoose = require("mongoose");

const InventoryLedgerSchema = new mongoose.Schema(
  {
    companyId: { type: String, trim: true, index: true, required: true },
    ownerType: { type: String, trim: true, enum: ["company", "distributor"], required: true },
    ownerId: { type: String, trim: true, required: true, index: true },
    distributorId: { type: String, trim: true, index: true },

    warehouseId: { type: String, trim: true, index: true },
    warehouseName: { type: String, trim: true },

    productId: { type: String, trim: true, index: true },
    productCode: { type: String, trim: true },
    productName: { type: String, trim: true, required: true },

    batchNo: { type: String, trim: true, index: true },
    movementType: {
      type: String,
      trim: true,
      required: true,
      enum: [
        "purchase_receipt",
        "company_dispatch",
        "distributor_receipt",
        "secondary_dispatch",
        "return_in",
        "return_out",
        "adjustment_in",
        "adjustment_out",
        "transfer_in",
        "transfer_out",
        "damage_out",
        "expiry_out",
      ],
    },
    direction: { type: String, trim: true, enum: ["in", "out"], required: true },
    qty: { type: Number, required: true },
    unitCost: { type: Number, default: 0 },
    totalValue: { type: Number, default: 0 },

    referenceType: { type: String, trim: true, required: true },
    referenceId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    referenceNo: { type: String, trim: true, index: true },

    postedAt: { type: Date, default: Date.now, index: true },
    postedByUserId: { type: String, trim: true },

    reversalOfLedgerId: { type: mongoose.Schema.Types.ObjectId, ref: "InventoryLedger" },
    isReversal: { type: Boolean, default: false },
  },
  { timestamps: true }
);

InventoryLedgerSchema.index({ companyId: 1, ownerType: 1, ownerId: 1, warehouseId: 1, productId: 1, postedAt: -1 });
InventoryLedgerSchema.index({ companyId: 1, referenceType: 1, referenceId: 1 });

module.exports = mongoose.models.InventoryLedger || mongoose.model("InventoryLedger", InventoryLedgerSchema);
