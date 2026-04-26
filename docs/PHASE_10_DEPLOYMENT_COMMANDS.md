# Phase 10 Deployment Commands

## Local

```bash
cd frontend
npm install
npm run build
```

```bash
cd ..
git add .
git commit -m "Phase 10: final operations reports tracking and customer billing"
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
