# Phase 15 Delete Files

No business files should be deleted in Phase 15.

Do not delete the old messages route yet because it is still used as a compatibility bridge for older portal/mobile logic.

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
