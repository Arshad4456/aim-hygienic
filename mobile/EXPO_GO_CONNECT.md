# Expo Go update guide (AIM ERP Mobile)

This update keeps mobile connected to the **same backend APIs** used by web and also provides a direct **Open Web Mirror** action inside each module screen so you can open the exact web frontend route.

## What changed

- Drawer header now always renders a visible sidebar (hamburger) button.
- Every module screen now shows a **Mirror URL** and an **Open Web Mirror** button.
- Mobile config now supports `EXPO_PUBLIC_WEB_BASE_URL` so mirror links can point to your website frontend domain.

## 1) Set env for backend + web frontend

From the `mobile/` folder, set:

```bash
export EXPO_PUBLIC_API_BASE_URL="https://www.aimhygienics.com"
export EXPO_PUBLIC_WEB_BASE_URL="https://www.aimhygienics.com"
```

> Use your real production/staging URL if different.

## 2) Start Expo with cache clear

```bash
npm install
npx expo start -c
```

## 3) Open in Expo Go

1. Install **Expo Go** on your Android phone.
2. Ensure phone and dev machine are on same network (or use tunnel mode).
3. Scan the QR code shown by Expo CLI.

## 4) Verify the new update is loaded

After scanning:

1. Login normally.
2. On dashboard, check top-left header: hamburger icon should be visible.
3. Open any module from dashboard list.
4. Confirm you see:
   - `Mirror URL: ...`
   - `Open Web Mirror` button.
5. Tap **Open Web Mirror** and verify it opens the matching website frontend route.

## 5) Will these changes show after scanning new QR code?

Yes — if you start Expo after pulling this code and scan the **new running session QR**, Expo Go loads the updated JS bundle.

If old UI still appears:

- shake device → **Reload**,
- run `npx expo start -c`,
- close and reopen Expo Go,
- rescan the QR code.

## Troubleshooting

- No sidebar button: verify you are on the updated bundle (clear cache + rescan).
- Mirror URL wrong: set `EXPO_PUBLIC_WEB_BASE_URL` correctly and restart Expo.
- API data not loading: verify backend URL in `EXPO_PUBLIC_API_BASE_URL` and auth token/login status.
