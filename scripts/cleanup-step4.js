const fs = require("fs");
const path = require("path");

const root = process.cwd();
const targets = [
  "backend/node_modules",
  "frontend/node_modules",
  "mobile/node_modules",
  "frontend/.next",
  "frontend/out",
  "frontend/dist",
  "backend/dist",
  "mobile/.expo",
  "mobile/dist",
  "coverage",
  ".cache",
  ".turbo",
  "frontend/src/modules/liveTracking",
];

for (const target of targets) {
  const fullPath = path.join(root, target);
  if (fs.existsSync(fullPath)) {
    fs.rmSync(fullPath, { recursive: true, force: true });
    console.log(`Deleted: ${target}`);
  }
}

console.log("Rawyan ERP Step 4 cleanup completed.");
