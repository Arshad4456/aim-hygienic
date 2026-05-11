# Rawyan ERP Phase 1 V4 — Frontend Landing + Mobile App Structure

## Frontend landing page
Landing-page implementation code was moved under `frontend/src/app/landing-page/*`.

Route files such as `/page.js`, `/about/page.js`, `/pricing/page.js`, `/book-demo/page.js`, `/features/page.js`, `/industries/page.js`, `/industries/[slug]/page.js`, and `/modules/page.js` are now thin Next.js route wrappers that export the real page component from `landing-page/pages`.

Landing shared files are now:

```txt
frontend/src/app/landing-page/components/PublicSiteLayout.js
frontend/src/app/landing-page/components/PublicSections.js
frontend/src/app/landing-page/data/marketingData.js
frontend/src/app/landing-page/pages/*.js
```

## Frontend API 502 cleanup
`frontend/src/app/infrastructure/api/apiClient.js` now sanitizes non-JSON HTML error pages. This prevents Cloudflare/Nginx 502 HTML from being rendered inside portal UI. The real cause still needs VPS/Nginx/PM2 checking.

## Mobile app restructure
Mobile code was moved to the same style as frontend:

```txt
mobile/src/app/config
mobile/src/app/foundation
mobile/src/app/infrastructure
mobile/src/app/navigation
mobile/src/app/i18n
mobile/src/app/modules/{erp-name}/{module-name}
```

Old mobile folders are no longer the target architecture:

```txt
mobile/src/api
mobile/src/auth
mobile/src/config
mobile/src/features
mobile/src/i18n
mobile/src/modules
mobile/src/navigation
mobile/src/screens
mobile/src/services
mobile/src/theme
mobile/src/ui
mobile/src/utils
```

A delete helper is included at `scripts/phase1-v4-delete-legacy-frontend-mobile-paths.sh`.
