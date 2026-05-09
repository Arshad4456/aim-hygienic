# Rawyan ERP Deployment Checklist

## Backend

- [ ] Set `NODE_ENV=production`
- [ ] Set MongoDB Atlas connection string in `MONGODB_URI`
- [ ] Set a strong `JWT_SECRET`
- [ ] Set `FRONTEND_URL`
- [ ] Set `CORS_ORIGIN`
- [ ] Set Cloudflare R2 credentials
- [ ] Confirm `GET /api/health` returns `200`
- [ ] Confirm `GET /api/health/ready` returns `200`
- [ ] Confirm uploads write to Cloudflare R2
- [ ] Confirm invoice/receipt print endpoints return data

## Frontend

- [ ] Set `NEXT_PUBLIC_API_BASE_URL`
- [ ] Run `npm install`
- [ ] Run `npm run lint`
- [ ] Run `npm run build`
- [ ] Test mobile responsive public website
- [ ] Test login routing for System Admin and Company Admin
- [ ] Test role-based sidebar for each ERP type

## Mobile

- [ ] Set `EXPO_PUBLIC_API_BASE_URL`
- [ ] Run `npm install`
- [ ] Run `npx expo start`
- [ ] Test Android login
- [ ] Test each ERP type mobile role
- [ ] Test document/POD upload helper
- [ ] Test mobile print-preview data
- [ ] Build production app through EAS

## MongoDB Atlas

- [ ] Use strong user password
- [ ] Restrict network access to deployment server where possible
- [ ] Enable backups
- [ ] Create indexes after first production load
- [ ] Use separate database for staging and production

## Cloudflare

- [ ] DNS points frontend/backend to correct servers
- [ ] SSL/TLS enabled
- [ ] R2 bucket configured
- [ ] R2 custom/public file URL configured
- [ ] Cache rules do not cache authenticated API responses

## Optional VPS deployment assets added

- `backend/ecosystem.config.js` for PM2 deployment
- `backend/Dockerfile` for backend container deployment
- `frontend/Dockerfile` for Next.js container deployment
- `docker-compose.production.example.yml` for backend + frontend with MongoDB Atlas external database

For PM2:

```bash
cd backend
npm ci --omit=dev
pm2 start ecosystem.config.js
pm2 save
```

For Docker Compose:

```bash
cp docker-compose.production.example.yml docker-compose.production.yml
docker compose -f docker-compose.production.yml up -d --build
```
