# Notifications Module

Phase 15 production notification center for Rawyan ERP.

It supports:
- in-app notification persistence,
- mobile push/SMS/WhatsApp/email channel status tracking,
- workflow trigger templates,
- role/user/audience scoped visibility,
- read/unread actions,
- legacy message compatibility for in-app messages.

External providers are intentionally guarded by environment checks. Without provider credentials, non-in-app channels are saved as `provider_not_configured` instead of failing the ERP workflow.
