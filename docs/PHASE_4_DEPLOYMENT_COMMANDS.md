# Phase 4 Deployment Commands

After applying the patch locally:

```bash
cd frontend
npm install
npm run build
```

Then commit and push:

```bash
cd ..
git add .
git commit -m "Phase 4: procurement supplier purchase foundation"
git push origin main
```

On Hostinger/server:

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
