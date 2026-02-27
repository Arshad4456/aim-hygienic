# AIM ERP Mobile (Expo)

Clean React Native client for AIM ERP using the existing backend API only.

## Environment

Set production API domain before running Expo:

```bash
export EXPO_PUBLIC_API_BASE_URL="https://aimhygienics.com"
```

`src/config/api.js` automatically calls `${BASE_URL}/api/*` endpoints, including login at `/api/auth/login`.

## Auth flow

- `POST /api/auth/login` with body:
  ```json
  {
    "mobile": "trimmed-value",
    "password": "..."
  }
  ```
- JWT stored in `expo-secure-store`
- Token attached as `Authorization: Bearer <token>` for all requests
- Any `401` response triggers automatic logout

## Run

```bash
npm install
npm run start
```
