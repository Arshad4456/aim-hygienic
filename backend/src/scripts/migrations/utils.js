const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.join(__dirname, "../../../.env") });
require("dotenv").config();

const { connectDB } = require("../../db");
const { listAllTenantTargets, getTenantModel } = require("../../utils/tenantModels");

function parseArgs(argv = process.argv.slice(2)) {
  const flags = new Set(argv);
  const getValue = (key, fallback = "") => {
    const found = argv.find((arg) => arg.startsWith(`${key}=`));
    return found ? found.slice(key.length + 1) : fallback;
  };
  return {
    dryRun: flags.has("--dry-run"),
    companyId: getValue("--companyId"),
    limit: Number(getValue("--limit", "0") || 0),
    verbose: flags.has("--verbose"),
  };
}

async function ensureDb() {
  await connectDB(process.env.MONGODB_URI);
}

async function getTargets(companyId = "") {
  const targets = await listAllTenantTargets();
  return companyId ? targets.filter((target) => String(target.companyId) === String(companyId)) : targets;
}

async function getTenantModels(target, registry) {
  const entries = await Promise.all(
    Object.entries(registry).map(async ([key, baseModel]) => [key, await getTenantModel(baseModel, target.companyId, target.companyName)])
  );
  return Object.fromEntries(entries);
}

function printSummary(title, summary) {
  console.log(`\n=== ${title} ===`);
  console.log(JSON.stringify(summary, null, 2));
}

async function closeDb() {
  await mongoose.connection.close();
}

module.exports = {
  parseArgs,
  ensureDb,
  getTargets,
  getTenantModels,
  printSummary,
  closeDb,
};
