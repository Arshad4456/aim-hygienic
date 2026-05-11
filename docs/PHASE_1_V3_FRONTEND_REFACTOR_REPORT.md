# Rawyan ERP — Phase 1 V3 Frontend Refactor Report

## Goal
Move frontend code into `frontend/src/app/*` and organize ERP UI code as:

```txt
frontend/src/app/modules/{erp-name}/{module-name}/{related files and folders}
```

## Main changes
- Moved Next.js App Router from `frontend/app/*` to `frontend/src/app/*`.
- Removed top-level frontend source folders such as `frontend/src/features`, `frontend/src/services`, `frontend/src/config`, `frontend/src/hooks`, `frontend/src/context`, `frontend/src/public-site`, `frontend/src/styles`, and `frontend/src/app-shell`.
- Moved app shell into `frontend/src/app/shell`.
- Moved app config into `frontend/src/app/config`.
- Moved public marketing site code into `frontend/src/app/public-site`.
- Moved services into module-owned service folders wherever possible.
- Added full industry-focused module folders for distribution, manufacturing, retail POS, garment, service business, logistics, trading/import, platform, and common role-aware modules.
- Added `frontend/src/app/modules/erpModuleManifest.js` to document ERP-wise modules and common role-aware module behavior.

## Role-aware common modules
Common modules such as dashboard, notifications, messages, reports, settings, files, and audit logs are not meant to show the same content to all users. They must always filter by:

```txt
companyId
erpType
role
permissions
branch/warehouse/territory scope
module/event type
```

## Important
This phase is structural. It prepares the frontend for real ERP development. It does not complete all pages for every module yet.
