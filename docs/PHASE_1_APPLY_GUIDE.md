# Phase 1 Apply Guide

## Apply changed files

1. Extract `rawyan-erp-phase1-changed-files.zip` into your project root.
2. Delete old legacy paths listed in `docs/DELETED_FILES.md` or run:

```bash
bash scripts/phase1-delete-legacy-paths.sh
```

## Validate locally

```bash
cd backend
npm install
npm run check:syntax

cd ../frontend
npm install
npm run build
```

## Deploy to VPS after pushing to GitHub

Your current folder/service names can stay for now:

```bash
cd /apps/aim-hygienic
git pull

cd frontend
npm install
npm run build
sudo systemctl restart aim-frontend

cd ../backend
npm install
sudo systemctl restart aim-backend

sudo nginx -t && sudo systemctl reload nginx
```

Later, after Phase 16, rename `/apps/aim-hygienic`, `aim-frontend`, and `aim-backend` to Rawyan ERP names.
