const mongoose = require("mongoose");

const VehicleMaintenanceSchema = new mongoose.Schema(
  {
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", required: true, index: true },
    date: { type: Date, required: true, index: true },
    maintenanceType: {
      type: String,
      enum: ["oil_change", "oil_filter", "car_wash", "tyre", "brake", "battery", "routine", "accidental", "other"],
      required: true,
    },
    odometer: { type: Number, default: 0 },
    vendor: { type: String, trim: true },
    cost: { type: Number, required: true },
    paidFromAccountId: { type: mongoose.Schema.Types.ObjectId, ref: "Account" },
    referenceNo: { type: String, trim: true },
    proofUrl: { type: String, trim: true },
    receiptUrl: { type: String, trim: true },
    notes: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("VehicleMaintenance", VehicleMaintenanceSchema);
