const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, unique: true, lowercase: true, trim: true },
    fullName: { type: String, required: true },
    mobile: { type: String, trim: true, unique: true, sparse: true },
    role: { type: String, required: true },
    status: { type: String, enum: ["active", "deactive"], default: "active" },
    passwordHash: { type: String, required: true },

    email: { type: String, trim: true, lowercase: true },
    companyId: { type: String, trim: true },
    companyName: { type: String, trim: true },
    companyBranchId: { type: String, trim: true },
    branchId: { type: String, trim: true },
    branchNameOrNumber: { type: String, trim: true },
    warehouseId: { type: String, trim: true },
    warehouseName: { type: String, trim: true },
    regionId: { type: String, trim: true },
    regionName: { type: String, trim: true },
    zoneId: { type: String, trim: true },
    zoneName: { type: String, trim: true },
    areaId: { type: String, trim: true },
    areaName: { type: String, trim: true },
    shopId: { type: String, trim: true },
    shopName: { type: String, trim: true },
    address: { type: String, trim: true },
    shopAddress: { type: String, trim: true },

    cnicNo: { type: String, trim: true },
    mobileNumber: { type: String, trim: true },
    phoneNumber: { type: String, trim: true },
    gpsLatitude: { type: String, trim: true },
    gpsLongitude: { type: String, trim: true },

    managerId: { type: String, trim: true },
    managerName: { type: String, trim: true },
    warehouseManagerId: { type: String, trim: true },
    warehouseManagerName: { type: String, trim: true },
    accountantId: { type: String, trim: true },
    accountantName: { type: String, trim: true },
    distributorId: { type: String, trim: true },
    distributorName: { type: String, trim: true },
    driverId: { type: String, trim: true },
    driverName: { type: String, trim: true },
    deliveryBoyId: { type: String, trim: true },
    deliveryBoyName: { type: String, trim: true },
    salesmanId: { type: String, trim: true },
    salesmanName: { type: String, trim: true },
    orderBookerId: { type: String, trim: true },
    orderBookerName: { type: String, trim: true },
    customerId: { type: String, trim: true },
    customerName: { type: String, trim: true },
    supplierId: { type: String, trim: true },
    supplierName: { type: String, trim: true },
    supplierWarehouseId1: { type: String, trim: true },
    supplierWarehouseName1: { type: String, trim: true },
    supplierWarehouseId2: { type: String, trim: true },
    supplierWarehouseName2: { type: String, trim: true },
    userId: { type: String, trim: true },
    territoryId: { type: String, trim: true },
    territoryName: { type: String, trim: true },
    fieldId: { type: String, trim: true },
    fieldName: { type: String, trim: true },
    businessType: { type: String, trim: true },
    businessName: { type: String, trim: true },
  },
  { timestamps: true }
);

UserSchema.index(
  { userId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      userId: { $exists: true, $type: "string", $ne: "" },
    },
  }
);

module.exports = mongoose.model("User", UserSchema);
