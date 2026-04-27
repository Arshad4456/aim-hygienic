# Rawyan ERP Phase 12 — System Admin / SaaS Control Center

Phase 12 converts the System Admin portal from a concept card into a real SaaS control foundation.

## Included

- `/api/system-admin/overview`
- `/api/system-admin/companies`
- `/api/system-admin/companies/:companyId/limits`
- `/api/system-admin/companies/:companyId/control`
- `/api/system-admin/subscription-plans`
- `/api/system-admin/seed-defaults`
- Company SaaS status fields: trial, active, inactive, suspended, expired, cancelled
- Company plan/status control from `/portals/system-admin`
- Subscription plan creation/update UI
- SaaS dashboard stats for companies, users, modules, ERP templates, and plans
- New canonical routes:
  - `/portals/system-admin`
  - `/portals/system-admin/companies`
  - `/portals/system-admin/subscriptions`
  - `/portals/system-admin/modules`

## System Admin responsibilities

System Admin is the SaaS owner and controls:

- Client companies
- ERP templates
- Subscription plans
- User limits
- Mobile user limits
- Module limits
- Company active/suspended status
- SaaS onboarding defaults

Company Admin still controls day-to-day company work such as users, suppliers, products, inventory, sales, and reports.
