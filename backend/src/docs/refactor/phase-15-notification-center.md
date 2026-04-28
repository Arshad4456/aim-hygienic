# Phase 15 — Notification Center + Multi-Channel Alert Foundation

## What Phase 15 adds

Phase 15 converts the old message concept into a real Notification Center portal.

It adds:
- `/api/notifications/overview` for dashboard KPIs and notification logs,
- `/api/notifications` for creating manual notifications,
- `/api/notifications/trigger` for workflow/event based alerts,
- `/api/notifications/:id/read` and `/api/notifications/read-all` for read state,
- in-app notification persistence,
- mobile push, SMS, WhatsApp, and email channel status tracking,
- role/user/audience based notification visibility,
- a real `/portals/notifications` UI with manual alerts, workflow triggers, filters, and read/unread actions.

## Provider behavior

No external SMS/WhatsApp/email dependency was hardcoded.

If provider credentials are missing, the channel is saved as `provider_not_configured` instead of breaking ERP work. This means business events can safely create notifications now, and provider adapters can be enabled later through environment variables.

Supported provider environment hooks:
- push: `FCM_SERVER_KEY`, `FIREBASE_PROJECT_ID`, or `EXPO_ACCESS_TOKEN`
- SMS: `SMS_PROVIDER_URL`, `SMS_API_KEY`, or `SMS_USERNAME`
- WhatsApp: `WHATSAPP_API_URL`, `WHATSAPP_ACCESS_TOKEN`, or `WHATSAPP_PHONE_NUMBER_ID`
- email: `SMTP_HOST`, `EMAIL_PROVIDER_API_KEY`, `MAILGUN_API_KEY`, or `SENDGRID_API_KEY`

## Workflow trigger events

Current trigger templates:
- `order_approved`
- `dispatch_assigned`
- `delivery_completed`
- `invoice_generated`
- `payment_received`
- `overdue_invoice`
- `supplier_payment_due`
- `low_balance`
- `stock_low`
- `return_requested`
- `vehicle_maintenance_due`

## Legacy compatibility

The old `/api/messages` route remains active. In-app notifications also create a legacy message record where possible so old message screens and mobile logic do not immediately break.

## Next suggested phase

Phase 16 should connect actual business modules to `/api/notifications/trigger`, especially:
- order approval,
- dispatch assignment,
- delivery completion,
- invoice generation,
- payment/receipt posting,
- low stock alerts,
- vehicle maintenance alerts.
