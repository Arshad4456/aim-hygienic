const { parseArgs, ensureDb, getTargets, printSummary, closeDb } = require("./utils");
const { migrateSalesOrders } = require("./01_migrate_sales_orders");
const { migrateInventoryMovements } = require("./02_migrate_inventory_movements");
const { migrateWarehouseTransactions } = require("./03_migrate_warehouse_transactions");
const { migrateReceipts } = require("./04_migrate_receipts");
const { migratePrimarySecondaryPayments } = require("./05_migrate_primary_secondary_payments");

async function main() {
  const options = parseArgs();
  await ensureDb();
  const targets = await getTargets(options.companyId);

  for (const target of targets) {
    console.log(`\n>>> Migrating companyId=${target.companyId} companyName=${target.companyName}`);
    printSummary("Sales Orders", await migrateSalesOrders(target, options));
    printSummary("Inventory Movements", await migrateInventoryMovements(target, options));
    printSummary("Warehouse Transactions", await migrateWarehouseTransactions(target, options));
    printSummary("Receipts", await migrateReceipts(target, options));
    printSummary("Primary / Secondary Payments", await migratePrimarySecondaryPayments(target, options));
  }

  await closeDb();
}

main().catch(async (error) => {
  console.error("Migration failed:", error);
  await closeDb();
  process.exit(1);
});
