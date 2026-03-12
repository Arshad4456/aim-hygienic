const mongoose = require("mongoose");

const ModuleTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, lowercase: true, unique: true },
    description: { type: String, trim: true, default: "" },
    category: { type: String, trim: true, default: "general" },
    types: { type: [String], default: [] },
    subtypes: { type: [String], default: [] },
    sections: { type: [String], default: [] },
    supportedActions: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ModuleTemplate", ModuleTemplateSchema);
