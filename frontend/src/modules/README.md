# Rawyan ERP Frontend Modules

Frontend code is organized by ERP type, not by a flat `features` folder.

- `common/` contains reusable UI modules whose data is still role, ERP type, permission, company, and module scoped.
- `system-admin/` contains SaaS-owner screens.
- `distribution/`, `manufacturing/`, `retail-pos/`, `garment/`, `service-business/`, `logistics/`, and `trading/` contain ERP-specific portals and modules.

A shared module such as notifications must never broadcast the same data to everyone. It should filter by `companyId`, `erpType`, `role`, `permission`, `module`, and `eventType`.
