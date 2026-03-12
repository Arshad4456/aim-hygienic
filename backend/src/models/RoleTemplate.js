const mongoose = require("mongoose");

const RoleTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, lowercase: true, unique: true },
    description: { type: String, trim: true, default: "" },
    applicableHierarchyCodes: { type: [String], default: [] },
    isMandatory: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

RoleTemplateSchema.pre("validate", function roleTemplateMandatory(next) {
  if (String(this.code || "").toLowerCase() === "company_admin") {
    this.isMandatory = true;
  }
  next();
});

module.exports = mongoose.model("RoleTemplate", RoleTemplateSchema);