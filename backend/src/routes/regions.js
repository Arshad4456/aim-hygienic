const Region = require("../models/Region");
const createTenantMasterRouter = require("../utils/createTenantMasterRouter");

module.exports = createTenantMasterRouter({
  baseModel: Region,
  collectionName: "regions",
  singular: "region",
  plural: "regions",
  duplicateMessage: "Region ID already exists",
  filterKeys: ["warehouseId"],
  searchKeys: ["regionId", "name", "warehouseName"],
  payloadBuilder(body) {
    return {
      regionId: String(body.regionId || "").trim(),
      name: String(body.name || "").trim(),
      warehouseId: String(body.warehouseId || "").trim(),
      warehouseName: String(body.warehouseName || "").trim(),
      status: String(body.status || "active").trim(),
    };
  },
});
