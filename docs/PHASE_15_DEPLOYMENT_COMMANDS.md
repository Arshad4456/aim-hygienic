# Phase 15 Deployment Commands

## Local

```bash
cd backend
npm install
node -c src/modules/notifications/notifications.service.js
node -c src/modules/notifications/notifications.controller.js
node -c src/modules/notifications/notifications.routes.js
```

```bash
cd ../frontend
npm install
npm run build
```

```bash
cd ..
git add .
git commit -m "Phase 15: notification center and multi-channel alert foundation"
git push origin main
```

## Server

```bash
cd /apps/aim-hygienic
git pull origin main

cd backend
npm install
sudo systemctl restart aim-backend

cd ../frontend
rm -rf .next
npm install
npm run build
sudo systemctl restart aim-frontend

sudo nginx -t && sudo systemctl reload nginx
```

## Verify

```bash
curl https://aimhygienics.com/api/health
curl https://aimhygienics.com/api/notifications/overview -H "Authorization: Bearer YOUR_TOKEN"
```

Then open:

```txt
https://aimhygienics.com/portals/notifications
https://aimhygienics.com/portals/messages
```

`/portals/messages` should continue to map to the Notification Center portal.
