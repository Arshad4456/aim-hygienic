# Rawyan ERP Phase 3 Patch

## Purpose

This patch fixes the live-permission/API problem visible on `/portals/roles` and starts Phase 3: Territory Architecture.

## Fixes included

- Frontend API client now uses same-origin `/api` first in production.
- Frontend API client now reads tokens from both `sessionStorage` and `localStorage`.
- Auth cache now supports both old `aim_*` keys and new `rawyan_*` keys.
- `/portals/territory` now opens a real Territory Architecture page instead of only redirecting to old region setup.
- Backend now exposes `/api/territory/overview` and `/api/territory/hierarchy`.

## Phase 3 foundation

Phase 3 starts the hierarchy:

Supplier/company operations still use existing data, but territory setup is now organized as:

`Region → Zone → Territory/Area → Field`

This structure will be used in upcoming phases for distributor coverage, user assignment, route plans, live location reporting, and sales targets.
