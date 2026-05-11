#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "Checking Phase 9 backend JavaScript syntax..."
node --check backend/server.js
node --check backend/src/config/validateEnv.js
node --check backend/src/routes/health.js
node --check backend/src/routes/index.js
node --check backend/ecosystem.config.js

echo "Checking Phase 9 mobile non-JSX JavaScript syntax..."
node --check mobile/src/config/mobileErpAccess.js
node --check mobile/src/api/industryModules.js
node --check mobile/src/api/endpoints.js
node --check mobile/src/navigation/RoleMenuConfig.js
node --check mobile/src/utils/roleRedirect.js

echo "Checking important Phase 9 files exist..."
test -f mobile/src/screens/industry/RetailPosMobileScreen.js
test -f mobile/src/screens/industry/ManufacturingMobileScreen.js
test -f mobile/src/screens/industry/ServiceMobileScreen.js
test -f mobile/src/screens/industry/TradingMobileScreen.js
test -f backend/src/routes/health.js
test -f docs/PHASE_9_MOBILE_TEST_DEPLOYMENT.md

echo "Phase 9 sanity check passed."
