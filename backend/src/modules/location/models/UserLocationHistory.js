const mongoose = require("mongoose");

const UserLocationHistorySchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, trim: true },
    companyId: { type: String, required: true, trim: true },
    distributorId: { type: String, trim: true },
    role: { type: String, required: true, trim: true },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: { type: [Number], required: true },
    },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    recordedAt: { type: Date, default: Date.now },
    source: { type: String, default: "mobile", trim: true },
  },
  { timestamps: true }
);

UserLocationHistorySchema.index({ userId: 1 });
UserLocationHistorySchema.index({ companyId: 1 });
UserLocationHistorySchema.index({ distributorId: 1 });
UserLocationHistorySchema.index({ recordedAt: -1 });
UserLocationHistorySchema.index({ location: "2dsphere" });
UserLocationHistorySchema.index({ companyId: 1, userId: 1, recordedAt: -1 });

module.exports = {
  modelName: "UserLocationHistory",
  collectionName: "userLocationHistories",
  schema: UserLocationHistorySchema,
};
