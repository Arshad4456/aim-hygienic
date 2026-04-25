# Phase 7 Deployment Commands

```bash
cd frontend
npm install
npm run build

cd ..
git add .
git commit -m "Phase 7: secondary sales distributor to customer foundation"
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
