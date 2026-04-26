const fs = require("fs");
const path = require("path");

const root = process.cwd();
const targets = [
  "frontend/app/portals/admin",
  "frontend/app/portals/distributor",
  "frontend/app/portals/customer",
  "frontend/app/portals/salesman",
  "frontend/app/portals/orderBooker",
  "frontend/app/portals/warehouseManager",
  "frontend/app/portals/deliveryBoy",
  "frontend/app/portals/supplier",
  "frontend/app/portals/brandManager",
  "frontend/app/portals/components",
  "frontend/app/portals/searchItems.js",
  "frontend/src/config/workingPortalRoutes.js",
  "frontend/node_modules",
  "frontend/.next",
  "backend/node_modules",
  "mobile/node_modules",
  "mobile/.expo",
  "aim-hygienics.archive",
];

for (const relative of targets) {
  const absolute = path.join(root, relative);
  if (!fs.existsSync(absolute)) continue;
  fs.rmSync(absolute, { recursive: true, force: true });
  console.log(`removed ${relative}`);
}

console.log("Phase 11 cleanup completed. Now run: cd frontend && npm install && npm run build");
