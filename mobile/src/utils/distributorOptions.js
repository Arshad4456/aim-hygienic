function text(value) {
  return String(value || '').trim();
}

function sameText(left, right) {
  return text(left).toLowerCase() === text(right).toLowerCase();
}

export function buildDistributorLookupParams(user) {
  const params = new URLSearchParams();
  const territoryId = text(user?.territoryId);
  const territoryName = text(user?.territoryName || user?.areaName);
  if (territoryId) params.set('territoryId', territoryId);
  if (territoryName) params.set('territoryName', territoryName);
  params.set('limit', '200');
  return params.toString();
}

export function filterDistributorsForUser(user, distributorUsers = []) {
  const territoryId = text(user?.territoryId);
  const territoryName = text(user?.territoryName || user?.areaName);

  if (!territoryId && !territoryName) return distributorUsers || [];

  return (distributorUsers || []).filter((item) => {
    const itemTerritoryId = text(item?.territoryId);
    const itemTerritoryName = text(item?.territoryName || item?.areaName);

    if (territoryId && itemTerritoryId && territoryId === itemTerritoryId) return true;
    if (territoryName && itemTerritoryName && sameText(territoryName, itemTerritoryName)) return true;
    return false;
  });
}

export function buildDistributorOptions(user, distributorUsers = []) {
  const filteredDirectory = filterDistributorsForUser(user, distributorUsers);

  const fromDirectory = filteredDirectory
    .map((item) => ({
      _id: text(item.userId || item._id),
      userId: text(item.userId || item._id),
      businessName: text(item.businessName),
      fullName: text(item.fullName),
      warehouseId: text(item.warehouseId),
      warehouseName: text(item.warehouseName),
      territoryId: text(item.territoryId),
      territoryName: text(item.territoryName || item.areaName),
      regionName: text(item.regionName),
      zoneName: text(item.zoneName),
    }))
    .filter((item) => item._id);

  const fallback = user
    ? [
        {
          _id: text(user.distributorId || user.distributorName),
          userId: text(user.distributorId),
          businessName: text(user.distributorName),
          fullName: text(user.distributorName),
          warehouseId: text(user.warehouseId),
          warehouseName: text(user.warehouseName),
          territoryId: text(user.territoryId),
          territoryName: text(user.territoryName || user.areaName),
          regionName: text(user.regionName),
          zoneName: text(user.zoneName),
        },
      ]
    : [];

  const options = [...fromDirectory, ...fallback].filter((item) => item?._id);
  const seen = new Set();
  return options.filter((item) => {
    if (seen.has(item._id)) return false;
    seen.add(item._id);
    return true;
  });
}
