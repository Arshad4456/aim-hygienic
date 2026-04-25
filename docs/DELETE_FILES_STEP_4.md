# Rawyan ERP Step 4 - Files/Folders to Delete

Delete or keep excluded from Git:

```txt
backend/node_modules
frontend/node_modules
mobile/node_modules
frontend/.next
frontend/out
frontend/dist
backend/dist
mobile/.expo
mobile/dist
coverage
.cache
.turbo
.env
.env.local
.env.production
*.log
frontend/src/modules/liveTracking
```

## Important legacy note

Keep `frontend/app/dashboards/[[...slug]]/page.js` temporarily as redirect only so old deployed links redirect to `/portals/*`.

Role-specific portal folders can remain until their real screens are migrated into `frontend/src/features/*` during the 10 ERP phases. Do not delete working business screens before replacement.
