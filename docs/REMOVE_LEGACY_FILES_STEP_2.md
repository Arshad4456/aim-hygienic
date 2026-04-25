# Remove Later — Not Now

Do not delete these immediately after Step 2. Keep them until production testing is complete.

## Keep temporarily

- `frontend/app/dashboards/[[...slug]]/page.js` — redirects old links to `/portals`.
- `frontend/src/modules/liveTracking/*` — compatibility wrappers for old imports.
- Legacy route files in `backend/src/routes/*` — still registered by the central route registrar.

## Safe to remove after Step 3 or Step 4

- `frontend/app/dashboards` redirect folder, once all users/bookmarks use `/portals`.
- `frontend/src/modules/liveTracking`, once no imports reference it.
- Backend legacy flat route files, after each module has its final controller/service/repository implementation.
