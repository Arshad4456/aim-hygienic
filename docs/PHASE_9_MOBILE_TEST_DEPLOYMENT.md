# Phase 9 - Mobile Sync, Testing, and Deployment Readiness

## What Phase 9 finalizes

Phase 9 connects the mobile application to the modules completed in previous phases and adds production-readiness checks for MongoDB Atlas, Cloudflare/R2 uploads, invoices, receipts, and health monitoring.

## Mobile synchronization completed

The Expo mobile app now has configuration, endpoint mappings, and role-aware menu filtering for:

- System Admin
- Company Admin
- Retail POS ERP roles
- Manufacturing ERP roles
- Service ERP roles
- Trading ERP roles
- Distribution field roles

The mobile sidebar is filtered by:

1. user role
2. company ERP template/type
3. company enabled modules
4. backend JWT/company scope

This prevents Retail POS, Manufacturing, Service, Trading, Distribution, and System Admin modules from mixing with each other in the mobile drawer.

## New mobile workspaces

The following mobile workspaces were added:

- Retail POS mobile workspace
- Manufacturing mobile workspace
- Service ERP mobile workspace
- Trading / Import mobile workspace
- System Admin mobile workspace
- Company Admin mobile control workspace

These screens read from the same secured backend APIs used by the web portal.

## File/document upload readiness

Mobile upload helpers now support generic document upload types:

- user-document
- company-document
- payment-proof
- proof-of-delivery
- invoice-attachment
- receipt-attachment
- vehicle-proof
- service-proof
- trading-document
- manufacturing-qc-proof

Cloudflare R2 should be configured from backend environment variables. Do not hard-code R2 keys in frontend or mobile.

## Print readiness

Mobile workspaces can request print-preview data from module print endpoints for:

- POS receipts
- Manufacturing production orders
- Service orders
- Trading shipments

For actual Bluetooth/thermal/mobile printing, add a printer SDK later. The backend and data structure are now ready.

## Production environment checklist

Backend required:

```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
JWT_SECRET=long-random-secret
FRONTEND_URL=https://your-domain.com
CORS_ORIGIN=https://your-domain.com,https://www.your-domain.com
```

Cloudflare R2 required for uploads:

```env
CLOUDFLARE_R2_ACCOUNT_ID=...
CLOUDFLARE_R2_BUCKET=...
CLOUDFLARE_R2_ACCESS_KEY_ID=...
CLOUDFLARE_R2_SECRET_ACCESS_KEY=...
CLOUDFLARE_R2_PUBLIC_BASE_URL=https://files.your-domain.com
```

Frontend required:

```env
NEXT_PUBLIC_API_BASE_URL=https://your-domain.com/api
NEXT_PUBLIC_APP_NAME="Rawyan ERP"
```

Mobile required:

```env
EXPO_PUBLIC_API_BASE_URL=https://your-domain.com/api
EXPO_PUBLIC_APP_NAME="Rawyan ERP"
```

## Health check URLs

Use these after deployment:

```text
GET /api/health
GET /api/health/ready
```

`/api/health/ready` returns `503` if the database or production environment is not ready.

## Suggested deployment flow

1. Push backend to VPS / Render / Railway / DigitalOcean.
2. Add production `.env` values.
3. Connect MongoDB Atlas.
4. Configure Cloudflare DNS and SSL.
5. Configure Cloudflare R2 public/custom domain for file access.
6. Deploy frontend with `NEXT_PUBLIC_API_BASE_URL` pointing to backend.
7. Build mobile app with EAS using production `EXPO_PUBLIC_API_BASE_URL`.
8. Test login for System Admin, Company Admin, and one role from each ERP type.
9. Test file uploads for POD, invoice attachment, receipt attachment, and service proof.
10. Test print data endpoints for invoices, receipts, POS receipts, production orders, service orders, and trading shipments.

## Must-test user scenarios

- System Admin logs in and sees only SaaS control screens.
- Company Admin logs in and sees only their own company modules.
- Retail POS Cashier sees POS, receipts, returns, and profile only.
- Production Supervisor sees manufacturing, inventory, warehouse, quality, and profile only.
- Service Technician sees service and inventory only.
- Import Officer sees trading, procurement, inventory, warehouse, finance, and profile only.
- A normal company user cannot access another company’s data by changing query params.
