const mongoose = require("mongoose");

const CompanySchema = new mongoose.Schema(
  {
    companyId: { type: String, required: true, trim: true, unique: true },
    slug: { type: String, trim: true },
    name: { type: String, required: true, trim: true },

    phone1: { type: String, trim: true },
    phone2: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    mainOfficeAddress: { type: String, trim: true },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

CompanySchema.index(
  { slug: 1 },
  {
    unique: true,
    partialFilterExpression: {
      slug: { $exists: true, $type: "string", $ne: "" },
    },
  }
);

module.exports = mongoose.model("Company", CompanySchema);
