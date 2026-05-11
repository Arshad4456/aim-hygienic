const Field = require("../models/Field");
const createTenantMasterRouter = require("../utils/createTenantMasterRouter");

module.exports = createTenantMasterRouter({
  baseModel: Field,
  collectionName: "fields",
  singular: "field",
  plural: "fields",
  moduleKey: "territory",
  duplicateMessage: "Field ID already exists",
  filterKeys: ["warehouseId", "regionId", "zoneId", "territoryId"],
  searchKeys: ["fieldId", "name", "warehouseName", "regionName", "zoneName", "territoryName"],
  payloadBuilder(body) {
    return {
      fieldId: String(body.fieldId || "").trim(),
      name: String(body.name || "").trim(),
      warehouseId: String(body.warehouseId || "").trim(),
      warehouseName: String(body.warehouseName || "").trim(),
      regionId: String(body.regionId || "").trim(),
      regionName: String(body.regionName || "").trim(),
      zoneId: String(body.zoneId || "").trim(),
      zoneName: String(body.zoneName || "").trim(),
      territoryId: String(body.territoryId || "").trim(),
      territoryName: String(body.territoryName || "").trim(),
      status: String(body.status || "active").trim(),
    };
  },
});
