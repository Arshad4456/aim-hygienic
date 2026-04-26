# Phase 11 Deployment Commands

## Local

```bash
cd frontend
npm install
npm run build
```

After successful build, optionally clean old portal folders:

```bash
cd ..
node scripts/cleanup-phase11-legacy-portals.js
cd frontend
npm install
npm run build
```

Then commit:

```bash
cd ..
git add .
git commit -m "Phase 11: real portal conversion and legacy cleanup"
git push origin main
```

## Server

```bash
cd /apps/aim-hygienic
git pull origin main

node scripts/cleanup-phase11-legacy-portals.js

cd frontend
rm -rf .next
npm install
npm run build
sudo systemctl restart aim-frontend

cd ../backend
npm install
sudo systemctl restart aim-backend

sudo nginx -t && sudo systemctl reload nginx
```

## Test URLs

```txt
/portals
/portals/system-admin
/portals/companies
/portals/erp-templates
/portals/products
/portals/customers
/portals/expenses
/portals/loans
/portals/returns
/portals/notifications
/portals/settings
/portals/admin/products
/portals/distributor/orders
/portals/customer/invoices
```
