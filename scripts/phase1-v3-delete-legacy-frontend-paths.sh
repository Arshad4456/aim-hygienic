#!/usr/bin/env bash
set -euo pipefail

rm -rf frontend/app
rm -rf frontend/src/app-shell
rm -rf frontend/src/components
rm -rf frontend/src/config
rm -rf frontend/src/context
rm -rf frontend/src/features
rm -rf frontend/src/hooks
rm -rf frontend/src/lib
rm -rf frontend/src/public-site
rm -rf frontend/src/services
rm -rf frontend/src/styles

echo "Legacy frontend paths deleted. Frontend source now lives under frontend/src/app/*."
