# AIM Hygienic Mobile (Expo)

Clean rebuild of the mobile client to consume the **same Node.js backend APIs** used by the website.

## Environment

Set API base URL (domain only; `/api` is appended automatically if missing):

```bash
EXPO_PUBLIC_API_BASE_URL=https://www.aimhygienics.com
```

You can place this in a `.env` file in `mobile/`.

## Run with Expo Go

```bash
npm install
npm run start
```

Then scan the QR code from Expo Go.

## Build Android APK with EAS

```bash
npm install -g eas-cli
cd mobile
eas login
eas build --platform android --profile preview
```

## OTA updates (optional)

```bash
eas update --branch production --message "Mobile UI update"
```

## Architecture

- `src/api/client.js`: centralized API client with token injection and global 401 logout handling.
- `src/auth/storage.js`: SecureStore persistence for `aim_token`, `aim_user`, `aim_role`.
- `src/navigation/*`: auth stack + role-aware drawer shell.
- `src/screens/common/DashboardHome.js`: role-based module tiles.
- `src/screens/roles/*`: role shell placeholders for all defined roles.

## Auth flow

- Login endpoint: `POST /auth/login`
- Body: `{ mobile: mobile.trim(), password }`
- Response expected: `{ token, user }`
- Session persisted in SecureStore and restored on app startup.
