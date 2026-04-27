# Phase 14 Deployment Commands

## Local

```bash
cd frontend
npm install
npm run build
```

```bash
cd ..
git add .
git commit -m "Phase 14: reports portal and finance service fix"
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

## Verify

```bash
curl https://aimhygienics.com/api/health
curl https://aimhygienics.com/api/reports/overview -H "Authorization: Bearer YOUR_TOKEN"
```

Then open:

```txt
https://aimhygienics.com/portals/finance
https://aimhygienics.com/portals/reports
```
