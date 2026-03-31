const mongoose = require("mongoose");

const UserLiveLocationSchema = new mongoose.Schema(
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
    lastSeenAt: { type: Date, default: Date.now },
    source: { type: String, default: "mobile", trim: true },
    dutySessionId: { type: String, trim: true },
  },
  { timestamps: true }
);

UserLiveLocationSchema.index({ userId: 1 });
UserLiveLocationSchema.index({ companyId: 1 });
UserLiveLocationSchema.index({ distributorId: 1 });
UserLiveLocationSchema.index({ recordedAt: -1 });
UserLiveLocationSchema.index({ lastSeenAt: -1 });
UserLiveLocationSchema.index({ location: "2dsphere" });
UserLiveLocationSchema.index({ companyId: 1, userId: 1 }, { unique: true });

module.exports = {
  modelName: "UserLiveLocation",
  collectionName: "userLiveLocations",
  schema: UserLiveLocationSchema,
};
