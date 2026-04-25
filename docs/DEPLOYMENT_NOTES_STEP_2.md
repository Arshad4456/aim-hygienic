# Deployment Notes — Step 2

This ZIP excludes `node_modules`, `.next`, `dist`, `build`, `.expo`, cache folders, and environment files.

## Local install

```bash
cd backend
npm install
npm start
```

```bash
cd frontend
npm install
npm run build
npm run dev
```

```bash
cd mobile
npm install
npm start
```

## Hostinger workflow

```bash
git pull origin main
cd backend && npm install && pm2 restart rawyan-erp-backend
cd ../frontend && npm install && npm run build && pm2 restart rawyan-erp-frontend
```

Check these URLs after deployment:

- `/api/health`
- `/api/erp-templates`
- `/portals/admin`
- `/dashboards/admin` should redirect to `/portals/admin`
