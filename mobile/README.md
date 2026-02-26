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
3. (One-time) link the app to your Expo project to generate a valid EAS UUID:
   ```bash
   eas login
   eas init
   ```
   If you already have an Expo project ID, you can set it manually:
   ```bash
   export EXPO_EAS_PROJECT_ID="your-valid-project-uuid"
   ```
4. Start Expo:
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
