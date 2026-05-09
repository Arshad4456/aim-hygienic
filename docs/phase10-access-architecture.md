# Phase 10: ERP Access Architecture & Portal Correction

This phase removes old-style portal assumptions and introduces one professional access flow:

1. User logs in.
2. Backend returns user + company + subscription + visible modules.
3. Frontend builds menu from one ERP access matrix.
4. Final access = ERP type + company enabled modules/plan + role modules + permissions.
5. System Admin sees SaaS controls only.
6. Company Admin sees company modules and plan usage, not all companies.
7. Normal users see only their own role/company modules.

Removed legacy frontend files:

- `frontend/app/lib/auth.js`
- `frontend/app/lib/dashboardRegistry.js`
- `frontend/app/lib/moduleAccess.js`
- `frontend/app/lib/roleRegistry.js`

Removed legacy refactor docs folder:

- `backend/src/docs/refactor/`

Added:

- `frontend/src/config/erpAccessMatrix.js`
- `backend/src/core/access/erpAccessMatrix.js`
- `frontend/src/app-shell/AccountDropdown.js`

The portal header now includes a professional account card with Profile Settings, Change Password, Language, Theme, and Logout.
