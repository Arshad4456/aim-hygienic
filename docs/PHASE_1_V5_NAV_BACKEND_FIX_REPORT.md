# Rawyan ERP Phase 1 V5 - Landing Navigation + Backend 502 Fix

## What changed

### Frontend landing page routes
The landing-page buttons in the public navbar now have real Next.js route files:

- `/features` -> `frontend/src/app/features/page.js`
- `/pricing` -> `frontend/src/app/pricing/page.js`
- `/book-demo` -> `frontend/src/app/book-demo/page.js`
- `/contact` -> `frontend/src/app/contact/page.js`
- `/about` -> `frontend/src/app/about/page.js`
- `/industries` -> `frontend/src/app/industries/page.js`
- `/industries/[slug]` -> `frontend/src/app/industries/[slug]/page.js`

The actual page code remains inside:

```txt
frontend/src/app/landing-page/pages/
```

The route files are thin wrappers only, so landing-page code stays organized.

### Frontend build reliability
Removed `next/font/google` from `frontend/src/app/layout.js` because it needs Google Fonts access during `npm run build`. On a VPS or restricted network this can fail. Font fallback variables are now local in `globals.css`.

### Backend 502 fix
The backend was crashing because this file used `requireCompanyModule()` without importing it:

```txt
backend/src/erp/common/finance/routes/loans.routes.js
```

Added the missing import:

```js
const { requireCompanyModule } = require("../../../platform/access/permissions/companyAccessGuard");
```

This was the direct reason Nginx/Cloudflare showed 502: backend was not listening on `127.0.0.1:5000` because the Node process exited.

## Validation

Backend syntax check passed with parallel node checks:

```bash
cd backend
find src -name '*.js' -print0 | xargs -0 -n1 -P4 node --check
node --check server.js
```

Frontend import path check passed:

```txt
Missing frontend imports: 0
```

Frontend production build compiled successfully, but the sandbox timed out during Next.js page-data collection. The important previous blocking error from Google Fonts was removed.

## No deleted files
This update does not delete legacy folders. It only adds route wrappers and fixes backend/runtime issues.
