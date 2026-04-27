# Phase 12 Delete Files

No business files should be deleted in Phase 12.

Still keep these out of Git and out of deployment ZIPs:

- `backend/node_modules`
- `frontend/node_modules`
- `mobile/node_modules`
- `frontend/.next`
- `frontend/out`
- `frontend/dist`
- `backend/dist`
- `backend/build`
- `mobile/.expo`
- `mobile/dist`
- `.env`
- `.env.local`
- `.env.production`
- `*.log`
- `aim-hygienics.archive`

Old role folders should only be removed after their screens are fully migrated and tested through `src/features`.
