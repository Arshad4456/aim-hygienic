# Expo Go update guide (AIM ERP Mobile)

This update keeps mobile connected to the **same backend APIs** used by web and improves the native mobile navigation UX:

- persistent sidebar/hamburger toggle in headers,
- grouped module list with collapsible dropdown sections in drawer,
- module screens showing data in mobile-friendly cards/tables instead of a mirror button.

## 1) Set backend URL

From `mobile/`:

```bash
export EXPO_PUBLIC_API_BASE_URL="https://www.aimhygienics.com"
```

## 2) Start Expo (clear old cache)

```bash
npm install
npx expo start -c
```

## 3) Open in Expo Go

1. Install **Expo Go** on your Android phone.
2. Keep phone + computer on same network (or use tunnel mode in Expo).
3. Scan the QR code shown in terminal.

## 4) Verify this update is active

After opening app in Expo Go:

1. Login.
2. Open any module screen and verify top-left **☰** sidebar button is visible.
3. Tap ☰ and verify modules are shown in grouped dropdown sections.
4. Open `Loan Detail` (or any module):
   - no "Open Web Mirror" button,
   - endpoints render in mobile cards/table format,
   - same backend data is loading in mobile app.

## 5) Will these changes show after scanning QR?

Yes. If you scan the QR from this updated Expo session, Expo Go loads the new JS bundle.

If old UI still appears:

- shake device → **Reload**,
- close/reopen Expo Go,
- run `npx expo start -c`,
- rescan QR.

## Troubleshooting

- Sidebar still missing: make sure app is on latest bundle (`expo start -c` + rescan).
- Module list not grouped: ensure you opened drawer via ☰ after login.
- Data empty/error: check `EXPO_PUBLIC_API_BASE_URL`, backend reachability, and auth token/login.
