const Region = require("../models/Region");
const Zone = require("../models/Zone");
const Area = require("../models/Area");
const Field = require("../models/Field");
const { listTenantMasterByCompany } = require("../../../platform/tenancy/utils/tenantMasters");
const { listAllTenantTargets } = require("../../../platform/tenancy/utils/tenantModels");

function isSystemLevelAdmin(user = {}) {
  const role = String(user.role || "").trim().toLowerCase();
  return role === "admin" || role === "system admin" || role === "super admin";
}

function normalizeId(value) {
  return String(value || "").trim();
}

function serialize(doc = {}) {
  const plain = typeof doc.toObject === "function" ? doc.toObject() : { ...doc };
  if (plain._id) plain._id = String(plain._id);
  return plain;
}

async function listLegacy(model, companyId) {
  const filter = companyId ? { companyId } : {};
  return model.find(filter).sort({ createdAt: -1 }).lean().catch(() => []);
}

async function listScopedCollection(collectionName, model, user = {}, query = {}) {
  const requestedCompanyId = normalizeId(query.companyId);
  const userCompanyId = normalizeId(user.companyId);
  const companyId = isSystemLevelAdmin(user) ? requestedCompanyId : userCompanyId;

  if (companyId) {
    const tenantRows = await listTenantMasterByCompany(companyId, collectionName);
    if (tenantRows?.length) return tenantRows.map(serialize);
    return (await listLegacy(model, companyId)).map(serialize);
  }

  if (isSystemLevelAdmin(user)) {
    const rows = [];
    const targets = await listAllTenantTargets().catch(() => []);
    for (const target of targets) {
      const tenantRows = await listTenantMasterByCompany(target.companyId, collectionName);
      rows.push(...(tenantRows || []));
    }
    if (rows.length) return rows.map(serialize);
  }

  return (await listLegacy(model, "")).map(serialize);
}

function matchesStatus(row, status) {
  if (!status) return true;
  return String(row.status || "active").toLowerCase() === String(status).toLowerCase();
}

function filterRows(rows, query = {}) {
  const status = normalizeId(query.status);
  const search = normalizeId(query.search).toLowerCase();
  return rows.filter((row) => {
    if (!matchesStatus(row, status)) return false;
    if (!search) return true;
    return [
      row.name,
      row.regionId,
      row.zoneId,
      row.areaId,
      row.fieldId,
      row.warehouseName,
      row.regionName,
      row.zoneName,
      row.territoryName,
    ].join(" ").toLowerCase().includes(search);
  });
}

function buildHierarchy({ regions, zones, areas, fields }) {
  const regionMap = new Map();
  for (const region of regions) {
    const key = normalizeId(region.regionId || region._id);
    regionMap.set(key, { ...region, zones: [] });
  }

  const unassigned = { regions: [], zones: [], areas: [], fields: [] };
  const zoneMap = new Map();
  for (const zone of zones) {
    const regionKey = normalizeId(zone.regionId);
    const node = { ...zone, areas: [] };
    zoneMap.set(normalizeId(zone.zoneId || zone._id), node);
    if (regionKey && regionMap.has(regionKey)) regionMap.get(regionKey).zones.push(node);
    else unassigned.zones.push(node);
  }

  const areaMap = new Map();
  for (const area of areas) {
    const zoneKey = normalizeId(area.zoneId);
    const node = { ...area, fields: [] };
    areaMap.set(normalizeId(area.areaId || area.territoryId || area._id), node);
    if (zoneKey && zoneMap.has(zoneKey)) zoneMap.get(zoneKey).areas.push(node);
    else unassigned.areas.push(node);
  }

  for (const field of fields) {
    const areaKey = normalizeId(field.territoryId || field.areaId);
    const node = { ...field };
    if (areaKey && areaMap.has(areaKey)) areaMap.get(areaKey).fields.push(node);
    else unassigned.fields.push(node);
  }

  return { regions: Array.from(regionMap.values()), unassigned };
}

async function getTerritoryOverview(user = {}, query = {}) {
  const [regionsRaw, zonesRaw, areasRaw, fieldsRaw] = await Promise.all([
    listScopedCollection("regions", Region, user, query),
    listScopedCollection("zones", Zone, user, query),
    listScopedCollection("areas", Area, user, query),
    listScopedCollection("fields", Field, user, query),
  ]);

  const regions = filterRows(regionsRaw, query);
  const zones = filterRows(zonesRaw, query);
  const areas = filterRows(areasRaw, query);
  const fields = filterRows(fieldsRaw, query);

  const hierarchy = buildHierarchy({ regions, zones, areas, fields });

  return {
    totals: {
      regions: regions.length,
      zones: zones.length,
      territories: areas.length,
      fields: fields.length,
      activeRegions: regions.filter((r) => matchesStatus(r, "active")).length,
      activeZones: zones.filter((r) => matchesStatus(r, "active")).length,
      activeTerritories: areas.filter((r) => matchesStatus(r, "active")).length,
      activeFields: fields.filter((r) => matchesStatus(r, "active")).length,
    },
    regions,
    zones,
    areas,
    fields,
    hierarchy,
  };
}

async function getTerritoryHierarchy(user = {}, query = {}) {
  const overview = await getTerritoryOverview(user, query);
  return { totals: overview.totals, hierarchy: overview.hierarchy };
}

module.exports = {
  getTerritoryOverview,
  getTerritoryHierarchy,
};
