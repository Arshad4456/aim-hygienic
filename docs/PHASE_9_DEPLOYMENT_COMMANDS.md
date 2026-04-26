# Phase 9 Deployment Commands

```bash
cd frontend
npm install
npm run build
```

```bash
cd ..
git add .
git commit -m "Phase 9: logistics delivery tracking and finance separation"
git push origin main
```

On server:

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
