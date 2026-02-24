const mongoose = require("mongoose");

const VehicleRefuelSchema = new mongoose.Schema(
  {
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    date: { type: Date, required: true, index: true },
    odometer: { type: Number, default: 0 },
    odometerPhotoUrl: { type: String, trim: true },
    liters: { type: Number, required: true },
    cost: { type: Number, default: 0 },
    vendor: { type: String, trim: true },
    paymentMethod: { type: String, enum: ["cash", "online", "card", "other"], default: "cash" },
    paidFromAccountId: { type: mongoose.Schema.Types.ObjectId, ref: "Account" },
    receiptUrl: { type: String, required: true, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("VehicleRefuel", VehicleRefuelSchema);