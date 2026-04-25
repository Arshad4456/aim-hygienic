# Phase 1 Deployment Commands

After copying this patch and pushing to GitHub:

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

Then open browser in incognito/private window and login again so the corrected token keys are used.
