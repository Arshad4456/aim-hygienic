# Rawyan ERP

Rawyan ERP is a modular SaaS ERP system for distribution, procurement, inventory, warehouse, sales, finance, fleet, live tracking, reports, and role-based mobile operations.

## Stack

- Backend: Node.js, Express.js, MongoDB, Mongoose
- Frontend: Next.js App Router, JavaScript, Tailwind CSS
- Mobile: Expo React Native

## Step 2 Architecture

- `backend/src/core` holds system-level ERP features such as ERP Templates, roles, permissions, audit, approvals, notifications.
- `backend/src/modules` holds business module wrappers and future controller/service/repository implementations.
- `frontend/app/portals` holds routes only.
- `frontend/src/features` holds reusable ERP module logic.
- `mobile/src/features` holds role-based mobile modules.

See `docs/RAWYAN_ERP_STEP_2_REFACTOR.md` for details.

## Phase 9 Status

Phase 9 adds final mobile synchronization and deployment readiness:

- ERP-type-aware mobile menus and role routing
- Retail POS, Manufacturing, Service, Trading, System Admin, and Company Admin mobile workspaces
- Generic mobile document upload helpers for Cloudflare R2-backed uploads
- Backend health/readiness checks at `/api/health` and `/api/health/ready`
- Deployment checklist for MongoDB Atlas, Cloudflare, frontend, backend, and Expo mobile

See `docs/PHASE_9_MOBILE_TEST_DEPLOYMENT.md` and `docs/DEPLOYMENT_CHECKLIST.md`.
