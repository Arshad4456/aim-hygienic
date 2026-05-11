# Changed Files Manifest

This ZIP contains Phase 1 architecture changes for Rawyan ERP.

## Main changed areas

- `backend/src/routes/index.js`
- `backend/server.js`
- `backend/src/erp/**`
- `backend/src/core/common-modules/**`
- `backend/src/core/supply-chain/**`
- `backend/src/core/finance/**`
- `backend/src/core/messaging/**`
- `frontend/src/modules/**`
- `frontend/src/app-shell/PortalRouteLoader.js`
- `docs/PHASE_1_REFACTOR_REPORT.md`
- `docs/DELETED_FILES.md`

## Validation commands

```bash
cd backend
npm run check:syntax

cd ../frontend
npm run build
```

## Apply helper

- `scripts/phase1-delete-legacy-paths.sh` removes the old `backend/src/modules`, old `frontend/src/features`, and the empty mobile account screen after changed files are copied.
