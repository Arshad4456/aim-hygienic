# Phase 6 Deployment Commands

Local test:

```bash
cd frontend
npm install
npm run build
```

Commit:

```bash
cd ..
git add .
git commit -m "Phase 6: primary sales company to distributor foundation"
git push origin main
```

Server:

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
