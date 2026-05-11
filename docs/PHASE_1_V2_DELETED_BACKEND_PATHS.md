# Rawyan ERP Phase 1 V2 Deleted Legacy Backend Paths

Delete these old backend folders after extracting the changed-files ZIP:

```txt
backend/src/models/
backend/src/routes/
backend/src/services/
backend/src/utils/
backend/src/modules/
backend/src/core/
```

Use the included helper:

```bash
bash scripts/phase1-backend-delete-legacy-paths.sh
```

The code from those folders was not simply thrown away. It was moved into:

```txt
backend/src/erp/{erp-name}/{module-name}/{controllers,models,permissions,routes,services,utils,validators,workflows}
```

Generic README-only module placeholders and empty `module.exports = {};` files were removed from the new ERP structure to reduce confusion.
