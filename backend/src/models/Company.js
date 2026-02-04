const mongoose = require("mongoose");

const CompanySchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },

    managerName: { type: String, trim: true },

    branches: [{ type: String, trim: true }],
    warehouses: [{ type: String, trim: true }],
    products: [{ type: String, trim: true }],

    phone1: { type: String, trim: true },
    phone2: { type: String, trim: true },
    email: { type: String, trim: true },
    address: { type: String, trim: true },

    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Company", CompanySchema);
