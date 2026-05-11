const Company = require("../../../platform/companies/models/Company");
const { toTenantDatabaseName } = require("../../../platform/tenancy/utils/tenantDatabases");

function asText(value) {
  return String(value || "").trim();
}

async function resolveTenantDbName(companyId, companyName = "") {
  const normalizedCompanyId = asText(companyId);
  const normalizedCompanyName = asText(companyName);

  if (!normalizedCompanyId && !normalizedCompanyName) return "";
  if (normalizedCompanyName) return toTenantDatabaseName(normalizedCompanyName, normalizedCompanyId || "company");

  const company = await Company.findOne({ companyId: normalizedCompanyId }).select("name").lean();
  return toTenantDatabaseName(company?.name || normalizedCompanyId, normalizedCompanyId || "company");
}

module.exports = { resolveTenantDbName, asText };