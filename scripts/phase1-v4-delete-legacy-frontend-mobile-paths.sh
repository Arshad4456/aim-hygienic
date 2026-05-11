#!/usr/bin/env bash
set -euo pipefail

rm -rf frontend/src/app/public-site

rm -rf mobile/src/api
rm -rf mobile/src/auth
rm -rf mobile/src/config
rm -rf mobile/src/features
rm -rf mobile/src/i18n
rm -rf mobile/src/modules
rm -rf mobile/src/navigation
rm -rf mobile/src/screens
rm -rf mobile/src/services
rm -rf mobile/src/theme
rm -rf mobile/src/ui
rm -rf mobile/src/utils

echo "Phase 1 V4 legacy frontend/mobile paths deleted."
