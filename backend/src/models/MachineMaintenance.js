const mongoose = require("mongoose");

const MachineMaintenanceSchema = new mongoose.Schema(
  {
    companyId: { type: String, trim: true, required: true, index: true },
    maintenanceNo: { type: String, trim: true, required: true },
    machineId: { type: String, trim: true },
    machineName: { type: String, trim: true, required: true },
    workCenter: { type: String, trim: true },
    maintenanceType: { type: String, trim: true, enum: ["preventive", "breakdown", "calibration", "inspection"], default: "preventive" },
    dueDate: Date,
    completedAt: Date,
    downtimeMinutes: { type: Number, default: 0 },
    cost: { type: Number, default: 0 },
    technicianName: { type: String, trim: true },
    status: { type: String, trim: true, enum: ["scheduled", "in_progress", "completed", "cancelled"], default: "scheduled", index: true },
    attachmentUrl: { type: String, trim: true },
    notes: { type: String, trim: true },
    createdByUserId: { type: String, trim: true },
  },
  { timestamps: true }
);

MachineMaintenanceSchema.index({ companyId: 1, maintenanceNo: 1 }, { unique: true });

module.exports = mongoose.models.MachineMaintenance || mongoose.model("MachineMaintenance", MachineMaintenanceSchema);
