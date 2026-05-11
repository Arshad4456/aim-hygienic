# Rawyan ERP

Rawyan ERP is being upgraded into a modular SaaS ERP platform with separate ERP-type folders, role-aware portals, and module-owned frontend/backend code.

## Stack

- Backend: Node.js, Express.js, MongoDB, Mongoose
- Frontend: Next.js App Router, JavaScript, Tailwind CSS
- Mobile: Expo React Native
- Deployment target: VPS, MongoDB Atlas, Cloudflare R2, Nginx, PM2/systemd

## Current Phase 1 Architecture

### Backend

Backend ERP code is organized under:

```txt
backend/src/erp/{erp-name}/{module-name}/
  controllers/
  models/
  permissions/
  routes/
  services/
  utils/
  validators/
  workflows/
```

### Frontend

All frontend source code now lives under:

```txt
frontend/src/app/*
```

ERP and business modules now live under:

```txt
frontend/src/app/modules/{erp-name}/{module-name}/
  pages/
  components/
  services/
  hooks/
  forms/
  tables/
  permissions/
  utils/
  validators/
  workflows/
```

Examples:

```txt
frontend/src/app/modules/distribution/territory/
frontend/src/app/modules/distribution/sales/
frontend/src/app/modules/logistics/live-tracking/
frontend/src/app/modules/manufacturing/production/
frontend/src/app/modules/retail-pos/pos/
frontend/src/app/modules/garment/hr-payroll/
frontend/src/app/modules/common/notifications/
frontend/src/app/modules/common/reports/
frontend/src/app/modules/platform/system-admin/
```

Common modules are role-aware. Dashboard, notifications, messages, reports, settings, files, and audit logs must always filter by `companyId`, `erpType`, `role`, `permissions`, and assigned business scope.

## Important Phase 1 Docs

- `docs/PHASE_1_V3_FRONTEND_REFACTOR_REPORT.md`
- `docs/PHASE_1_V3_FRONTEND_DELETED_PATHS.md`
- `frontend/src/app/modules/erpModuleManifest.js`
