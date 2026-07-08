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

## Deployment

- Vercel: deploy the repository root for the static storefront and admin pages
- Render: deploy the backend using `render.yaml`
- Vercel environment variable: set `RENDER_BACKEND_ORIGIN` to your Render backend URL, for example `https://desi-chamak-api.onrender.com`
```

## Git structure

Everything lives in one Git repository so the storefront, admin panel, and backend can be versioned together.
