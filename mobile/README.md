# AIM Hygienic Mobile (Expo)

This mobile app is a **client only** for the existing AIM backend APIs.
It mirrors website dashboards/modules discovered from `frontend/app/dashboards/**/page.js`.

## Environment

```bash
EXPO_PUBLIC_API_BASE_URL=https://www.aimhygienics.com
```

`src/api/client.js` follows web behavior by appending `/api` automatically when missing.

## Run

```bash
cd mobile
npm install
npm run start
```

## Build APK (EAS)

```bash
eas login
eas build --platform android --profile preview
```

## Auth contract (same as web)

- Endpoint: `POST /auth/login`
- Body: `{ mobile: mobile.trim(), password }`
- Response: `{ token, user }`
- Storage: `expo-secure-store` keys `aim_token`, `aim_user`, `aim_role`

## Generated module parity

- Source scan: `frontend/app/dashboards/**/page.js`
- Generated map: `src/navigation/moduleMap.json`
- Generated role menu config: `src/navigation/RoleMenuConfig.js`
- Generated screen registry: `src/navigation/ScreenRegistry.js`
- Mobile screens: `src/screens/<role>/**`

Each generated module screen is wired to endpoint(s) extracted from its corresponding web page (`apiFetch(...)` usage) and performs GET fetches where applicable.

## Upload flow

Use backend presigned flow via `src/api/uploads.js`:
1. request presigned URL from backend (`/uploads/presign`)
2. upload file with PUT to returned URL
3. confirm save in backend (`/uploads/complete`)
