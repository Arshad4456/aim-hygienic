# Phase 12 Deployment Commands

## Local

```bash
cd frontend
npm install
npm run build
```

```bash
cd ..
git add .
git commit -m "Phase 12: system admin SaaS control center"
git push origin main
```

## Server

```bash
cd /apps/aim-hygienic
git pull origin main

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

- `/portals/system-admin`
- `/portals/system-admin/companies`
- `/portals/system-admin/subscriptions`
- `/portals/system-admin/modules`
