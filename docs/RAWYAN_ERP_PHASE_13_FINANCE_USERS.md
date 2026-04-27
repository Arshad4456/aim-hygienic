# Rawyan ERP Phase 13 — Users + Finance, Accounts, Expenses, Loans, Ledgers

## User creation rules

### First System Admin / SaaS Owner
Create the first Rawyan ERP System Admin through the bootstrap API once after deployment:

```bash
curl -X POST https://aimhygienics.com/api/system-admin/bootstrap-system-admin \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Rawyan Owner","username":"owner","mobile":"03000000000","password":"ChangeMe123"}'
```

If `SYSTEM_ADMIN_BOOTSTRAP_KEY` is set on the server, include `"bootstrapKey":"YOUR_KEY"`.

### System Admin creates users from
`/portals/system-admin/users`

System Admin can create:
- more System Admin users
- Company Admin users
- company-level users by selecting company + role

### Company Admin creates users from
`/portals/users`

Company Admin can create:
- finance manager
- accountant
- purchase manager
- warehouse manager
- distributor
- salesman
- order booker
- delivery boy
- customer/supplier portal users

Company Admin cannot create System Admin users.

### Distributor creates limited users from
`/portals/users`

Distributor can create only assigned-scope users such as salesman, order booker, and customer users.

## Phase 13 finance scope

Phase 13 adds a stronger finance foundation:
- cash/bank account creation
- account ledger view
- cash-in/cash-out transaction view
- supplier payables
- distributor receivables
- customer receivables
- expenses view
- loans view
- KPIs for account balance, expenses, and loans

## Important portal routes

- `/portals/system-admin/users`
- `/portals/users`
- `/portals/finance`
- `/portals/finance/receipts`
- `/portals/finance/payments`
- `/portals/expenses`
- `/portals/loans`
