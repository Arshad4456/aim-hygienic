# Phase 14 Delete Files

No business files should be deleted in Phase 14.

The old legacy-delete plan is still valid: delete legacy transaction models only after web UI testing, mobile testing, and production backup/export are complete.

Still do not commit these generated/dependency files:

```txt
backend/node_modules
frontend/node_modules
mobile/node_modules
frontend/.next
frontend/out
frontend/dist
backend/dist
backend/build
mobile/.expo
mobile/dist
*.log
.env
.env.local
.env.production
```
