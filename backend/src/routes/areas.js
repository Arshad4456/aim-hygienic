const Area = require("../models/Area");
const createTenantMasterRouter = require("../utils/createTenantMasterRouter");

module.exports = createTenantMasterRouter({
  baseModel: Area,
  collectionName: "areas",
  singular: "area",
  plural: "areas",
  duplicateMessage: "Territory ID already exists",
  filterKeys: ["warehouseId", "regionId", "zoneId"],
  searchKeys: ["areaId", "name", "warehouseName", "regionName", "zoneName"],
  payloadBuilder(body) {
    return {
      areaId: String(body.areaId || "").trim(),
      name: String(body.name || "").trim(),
      warehouseId: String(body.warehouseId || "").trim(),
      warehouseName: String(body.warehouseName || "").trim(),
      regionId: String(body.regionId || "").trim(),
      regionName: String(body.regionName || "").trim(),
      zoneId: String(body.zoneId || "").trim(),
      zoneName: String(body.zoneName || "").trim(),
      status: String(body.status || "active").trim(),
    };
  },
});
