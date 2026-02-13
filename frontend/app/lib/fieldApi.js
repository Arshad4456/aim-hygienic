import { apiFetch } from "./api";

function is404(error) {
  return /404/.test(String(error?.message || ""));
}

function areaToField(area) {
  return {
    _id: area._id,
    fieldId: area.areaId,
    name: area.name,
    warehouseId: area.warehouseId,
    warehouseName: area.warehouseName,
    regionId: area.regionId,
    regionName: area.regionName,
    zoneId: area.zoneId,
    zoneName: area.zoneName,
    territoryId: area.areaId,
    territoryName: area.name,
    status: area.status || "active",
    _legacyFromAreas: true,
  };
}

function fieldToAreaPayload(field) {
  return {
    areaId: field.fieldId,
    name: field.name,
    warehouseId: field.warehouseId,
    warehouseName: field.warehouseName,
    regionId: field.regionId,
    regionName: field.regionName,
    zoneId: field.zoneId,
    zoneName: field.zoneName,
    status: field.status || "active",
  };
}

export async function listFieldsCompat() {
  try {
    const data = await apiFetch("/fields");
    return { fields: data.fields || [], legacy: false };
  } catch (error) {
    if (!is404(error)) throw error;
    const areas = await apiFetch("/areas");
    return { fields: (areas.areas || []).map(areaToField), legacy: true };
  }
}

export async function createFieldCompat(payload) {
  try {
    return await apiFetch("/fields", { method: "POST", body: payload });
  } catch (error) {
    if (!is404(error)) throw error;
    return apiFetch("/areas", { method: "POST", body: fieldToAreaPayload(payload) });
  }
}

export async function updateFieldCompat(id, payload) {
  try {
    return await apiFetch(`/fields/${id}`, { method: "PUT", body: payload });
  } catch (error) {
    if (!is404(error)) throw error;
    return apiFetch(`/areas/${id}`, { method: "PUT", body: fieldToAreaPayload(payload) });
  }
}

export async function deleteFieldCompat(id) {
  try {
    return await apiFetch(`/fields/${id}`, { method: "DELETE" });
  } catch (error) {
    if (!is404(error)) throw error;
    return apiFetch(`/areas/${id}`, { method: "DELETE" });
  }
}
