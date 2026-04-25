# Rawyan ERP Phase 2 — Users, Roles, Permissions, and Portal Access

Phase 2 makes Rawyan ERP permission-driven instead of only folder-driven.

## Included

- Default ERP role blueprints for Super Admin, Company Admin, CEO, Finance Manager, Accountant, Distributor, Salesman, Order Booker, Warehouse Manager, Delivery Boy, Customer, Supplier, and Brand Manager.
- Backend role seeding endpoint: `POST /api/roles/seed-defaults`.
- Backend user access endpoints under `/api/user-access`.
- User role assignment endpoint: `PATCH /api/user-access/users/:id/role`.
- User access override endpoint: `PATCH /api/user-access/users/:id/access`.
- User status endpoint: `PATCH /api/user-access/users/:id/status`.
- Frontend `/portals/roles` role builder.
- Frontend `/portals/users` user access manager.
- Mobile permission helper updates for mobileModules.

## Purpose

Phase 2 prepares the system so every company can have its own users, roles, portal access, and mobile access without creating new hardcoded dashboard folders.
