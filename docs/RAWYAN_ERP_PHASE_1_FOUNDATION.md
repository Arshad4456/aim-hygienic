# Rawyan ERP Phase 1: Company, Branch, ERP Template, Subscription Foundation

This patch starts the 10-phase ERP build and also fixes the two live issues visible after Step 4.

## Fixes included

1. `/api/auth/me` is now safer and can load a user from root or tenant user data.
2. Frontend API token reading now supports the current login storage keys including `sessionStorage.aim_token`.
3. Next.js optional catch-all params are awaited, so `/portals/territory` no longer resolves as `/portals`.
4. Portal menus now point to the existing working module screens during migration, so module clicks open real data pages instead of only the dynamic dashboard placeholder.
5. Permission checks now support `{ actions: [...] }` objects and module key aliases like `primary-orders` and `primary-sales-orders`.

## Phase 1 foundation added

- Company branches API: `/api/company-branches`
- Subscription plans/company subscriptions API: `/api/subscriptions`
- CompanyBranch model
- SubscriptionPlan model
- CompanySubscription model

## Important

This phase intentionally keeps the old working portal screens in place. During the next phases, each real screen will be moved into `src/features/*` one module at a time.
