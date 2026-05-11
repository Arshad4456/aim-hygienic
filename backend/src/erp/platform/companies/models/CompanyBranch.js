const mongoose = require("mongoose");

const CompanyBranchSchema = new mongoose.Schema(
  {
    companyId: { type: String, required: true, trim: true, index: true },
    branchCode: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, trim: true, default: "branch" },
    address: { type: String, trim: true },
    city: { type: String, trim: true },
    regionId: { type: String, trim: true },
    zoneId: { type: String, trim: true },
    warehouseId: { type: String, trim: true },
    managerId: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    status: { type: String, enum: ["active", "inactive"], default: "active", index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

CompanyBranchSchema.index({ companyId: 1, branchCode: 1 }, { unique: true });
module.exports = mongoose.models.CompanyBranch || mongoose.model("CompanyBranch", CompanyBranchSchema);
