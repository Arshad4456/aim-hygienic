# Rawyan ERP — Step 3 Permission Portal Engine

Step 3 upgrades Rawyan ERP from static role folders toward a professional SaaS ERP permission engine.

## Added in this patch

- Backend Role model and Role API.
- Backend PortalModule model and module catalog API.
- Permission service and `requirePermission(moduleKey, action)` middleware.
- `/api/auth/me` endpoint that returns user, role, permissions, portal type, enabled modules, and visible modules.
- Frontend dynamic `/portals` and `/portals/[[...slug]]` route loader.
- Permission-based sidebar/menu foundation.
- `Can` component to hide/show UI actions by permission.
- Mobile permission/menu builder foundation.

## Rule after Step 3

```txt
app/portals = routes only
frontend/src/features = ERP screen logic
backend/src/core = SaaS engine
backend/src/modules = ERP business modules
mobile/src/features = mobile role actions
```

Copy this patch over your project root and replace matching files. Do not delete old role portal folders until those screens are migrated into `frontend/src/features`.
