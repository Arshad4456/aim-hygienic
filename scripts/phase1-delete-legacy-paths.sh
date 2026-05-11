#!/usr/bin/env bash
set -euo pipefail

# Run from project root after copying Phase 1 changed files.
# This removes old Rawyan ERP placeholder/moved paths that create confusion after the new architecture is applied.

paths=(
  "backend/src/modules"
  "frontend/src/features"
  "mobile/src/screens/admin/account/AccountScreen.js"
)

for p in "${paths[@]}"; do
  if [ -e "$p" ]; then
    rm -rf "$p"
    echo "deleted $p"
  fi
done
