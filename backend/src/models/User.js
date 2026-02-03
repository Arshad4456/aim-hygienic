const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    fullName: { type: String, required: true },
    mobile: { type: String, default: "" },
    role: {
      type: String,
      required: true,
      enum: ["admin", "manager", "nsm", "asm", "rsm", "tse", "salesman", "accountant", "store", "kpo", "delivery_boy"],
    },
    distributor: { type: String, default: "" },
    company: { type: String, default: "AIM Hygienic (Pvt) Limited" },
    status: { type: String, enum: ["active", "deactive"], default: "active" },
    passwordHash: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
