# Rawyan ERP Step 4 - Final Setup

Step 4 finalizes the setup layer before the 10 ERP implementation phases.

## Completed

- Final Rawyan ERP portal route registry added.
- Canonical module names added for same-name modules with different business meaning.
- Legacy portal paths mapped to professional feature routes.
- Permission-ready dynamic portal loader completed.
- Responsive PortalShell, Sidebar, Header, and MobileNav updated.
- Rawyan ERP design tokens, gradients, and portal themes finalized.
- Duplicate frontend `src/modules/liveTracking` should be removed because live tracking now lives in `src/features/live-tracking`.
- Backend final module catalog added for Phase 1+ integration.
- Mobile route registry added for role-based mobile modules.
- Repository hygiene finalized through `.gitignore` files.

## Final folder rule

```txt
app folder = routes only
src/features = module UI and business screens
src/components = reusable UI
src/config = route, menu, module, permission, ERP template config
backend/src/core = SaaS system logic
backend/src/modules = ERP business modules
mobile/src/features = role-based mobile actions
```

## Canonical supply chain

```txt
Supplier -> Company -> Company Warehouse -> Distributor -> Customer
```

## Sales terminology

```txt
Primary Sales = Company -> Distributor
Secondary Sales = Distributor -> Customer
Purchase Orders = Supplier -> Company
Dispatch Orders = Warehouse -> Delivery
Customer Orders = Customer/Retailer order workflow
```

After this step, move to Phase 1: Company, Branch, ERP Template, and Subscription Foundation.
