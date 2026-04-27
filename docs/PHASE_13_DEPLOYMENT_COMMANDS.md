# Phase 13 Deployment Commands

## Local

```bash
cd frontend
npm install
npm run build
```

```bash
cd ..
git add .
git commit -m "Phase 13: user creation and finance accounts ledger foundation"
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

## First System Admin Bootstrap

```bash
curl -X POST https://aimhygienics.com/api/system-admin/bootstrap-system-admin \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Rawyan Owner","username":"owner","mobile":"03000000000","password":"ChangeMe123"}'
```
