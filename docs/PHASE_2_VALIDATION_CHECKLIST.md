# Phase 2 Validation Checklist

- [ ] Frontend build passes.
- [ ] Backend restarts without route errors.
- [ ] `/api/roles` returns role list.
- [ ] `/api/roles/seed-defaults` creates default roles.
- [ ] `/api/user-access/users` returns scoped users.
- [ ] `/portals/roles` opens the role builder.
- [ ] `/portals/users` opens the user access manager.
- [ ] Assigning a role updates the user's role, roleId, permissions, enabledModules, portalType, landingPath, mobileAccess, and mobileModules.
- [ ] Logging out and logging in again shows the updated portal menu.
