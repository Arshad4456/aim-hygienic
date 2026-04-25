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
