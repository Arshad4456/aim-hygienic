const Zone = require("../models/Zone");
const createTenantMasterRouter = require("../utils/createTenantMasterRouter");

module.exports = createTenantMasterRouter({
  baseModel: Zone,
  collectionName: "zones",
  singular: "zone",
  plural: "zones",
  duplicateMessage: "Zone ID already exists",
  filterKeys: ["warehouseId", "regionId"],
  searchKeys: ["zoneId", "name", "warehouseName", "regionName"],
  payloadBuilder(body) {
    return {
      zoneId: String(body.zoneId || "").trim(),
      name: String(body.name || "").trim(),
      warehouseId: String(body.warehouseId || "").trim(),
      warehouseName: String(body.warehouseName || "").trim(),
      regionId: String(body.regionId || "").trim(),
      regionName: String(body.regionName || "").trim(),
      status: String(body.status || "active").trim(),
    };
  },
});
