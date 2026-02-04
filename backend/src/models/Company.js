const mongoose = require("mongoose");

const CompanySchema = new mongoose.Schema(
  {
    companyId: { type: String, required: true, trim: true, unique: true },
    name: { type: String, required: true, trim: true },

    phone1: { type: String, trim: true },
    phone2: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    mainOfficeAddress: { type: String, trim: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Company", CompanySchema);
