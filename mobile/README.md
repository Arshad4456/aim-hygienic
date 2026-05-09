# AIM ERP Mobile (Expo)

This project is an Expo-based React Native ERP mobile client for Android-first distribution.

## Highlights
- JWT authentication via `POST /api/auth/login`.
- Secure token storage using `expo-secure-store`.
- Role-based dashboards (Admin, Warehouse Manager, Distributor, Salesman, Orderbooker, Customer, Account Officer, CEO/MD).
- Drawer + stack navigation with module-level access.
- Backend-driven business logic and hierarchy filtering (`Region → Zone → Territory → Field`).
- Cloudflare R2 proof upload flow via backend presigned URLs.
- APK-first EAS profile and Play Store-ready AAB profile.

## Folder layout

```
src/
  components/
  context/AuthContext.js
  hooks/
  navigation/
  screens/
  services/api.js
  utils/
```

## Run locally

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure API base URL:
   ```bash
   export EXPO_PUBLIC_API_BASE_URL="https://your-vps-domain.com"
   ```
3. Start Expo:
   ```bash
   npm run start
   ```

## Build artifacts

- APK (internal distribution first):
  ```bash
  eas build --profile preview --platform android
  ```
- AAB (Play Store later):
  ```bash
  eas build --profile production --platform android
  ```

## Security model

- Mobile app contains no business rules.
- All permissions validated on backend middleware.
- Token expiry/invalid token should trigger logout in production interceptors.
- HTTPS-only backend endpoints.
- No direct R2 write credentials inside app.

## Future phases

- Firebase Cloud Messaging push notifications.
- Offline queue sync (order creation, trip entry, POD upload).
## Phase 9 mobile sync

The mobile app is now aligned with Rawyan ERP industry templates and supports role-aware menus for:

- System Admin
- Company Admin
- Retail POS ERP roles
- Manufacturing ERP roles
- Service ERP roles
- Trading ERP roles
- Distribution field roles

Set the production API URL before running or building:

```env
EXPO_PUBLIC_API_BASE_URL=https://your-domain.com/api
```

The mobile drawer is filtered by the logged-in user's role and company ERP type. Industry workspaces read from secured backend APIs and support print-preview data for receipts, production orders, service orders, and trading shipments.
