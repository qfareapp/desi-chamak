# Desi Chamak Monorepo

This repository is organized as a single Git monorepo for the Desi Chamak ecommerce project.

## Packages

- `admin/`: static admin panel
- `backend/`: Node.js/Express API
- repository root: storefront HTML, CSS, JS, and assets

## Workspace commands

Run these from the repository root:

```bash
npm install
npm run dev:admin
npm run dev:backend
```

## Git structure

Everything lives in one Git repository so the storefront, admin panel, and backend can be versioned together.
