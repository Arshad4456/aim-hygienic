const mongoose = require("mongoose");

const UserDutySessionSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, trim: true },
    companyId: { type: String, required: true, trim: true },
    distributorId: { type: String, trim: true },
    role: { type: String, required: true, trim: true },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date },
    lastSeenAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
    startLocation: {
      type: {
        type: String,
        enum: ["Point"],
      },
      coordinates: { type: [Number] },
    },
    endLocation: {
      type: {
        type: String,
        enum: ["Point"],
      },
      coordinates: { type: [Number] },
    },
  },
  { timestamps: true }
);

UserDutySessionSchema.index({ userId: 1 });
UserDutySessionSchema.index({ companyId: 1 });
UserDutySessionSchema.index({ distributorId: 1 });
UserDutySessionSchema.index({ lastSeenAt: -1 });
UserDutySessionSchema.index({ companyId: 1, userId: 1, isActive: 1 });
UserDutySessionSchema.index({ startLocation: "2dsphere" });
UserDutySessionSchema.index({ endLocation: "2dsphere" });

module.exports = {
  modelName: "UserDutySession",
  collectionName: "userDutySessions",
  schema: UserDutySessionSchema,
};
