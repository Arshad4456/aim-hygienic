#!/usr/bin/env bash
set -euo pipefail
rm -rf backend/src/models backend/src/routes backend/src/services backend/src/utils backend/src/modules backend/src/core
printf 'Deleted legacy backend folders after Phase 1 backend module migration.
'
