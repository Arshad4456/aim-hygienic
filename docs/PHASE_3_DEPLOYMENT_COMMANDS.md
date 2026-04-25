# Phase 3 Deployment Commands

After copying the patch into your project:

```bash
cd frontend
npm install
npm run build
```

Then commit and push:

```bash
cd ..
git add .
git commit -m "Phase 3: fix live permissions and add territory architecture"
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

After deploy, open an incognito window, login again, and test:

- `/portals/roles`
- `/portals/users`
- `/portals/territory`
- `/api/health`
