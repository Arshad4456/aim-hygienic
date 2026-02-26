export function buildHierarchyFilter(user = {}) {
  return {
    region_id: user.region_id,
    zone_id: user.zone_id,
    territory_id: user.territory_id,
    field_id: user.field_id
  };
}
