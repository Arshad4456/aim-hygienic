const mongoose = require("mongoose");

function toTenantDatabaseName(value, fallback = "company") {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || fallback;
}

async function ensureDatabaseExists(databaseName) {
  const name = toTenantDatabaseName(databaseName);
  const db = mongoose.connection.useDb(name, { useCache: true });
  const marker = db.collection("__tenant_meta");
  await marker.updateOne(
    { _id: "init" },
    { $set: { initializedAt: new Date(), name } },
    { upsert: true }
  );
  return name;
}

module.exports = { toTenantDatabaseName, ensureDatabaseExists };