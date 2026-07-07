# Desi Chamak Backend

This backend adds MongoDB-backed APIs for the static ecommerce admin and storefront.

## What it includes

- Express server with MongoDB connection via Mongoose
- `Product` model for catalog, gallery, pricing, inventory, widget details, tabs, and related products
- `ContentSection` model for homepage/admin-managed sections such as hero, arrivals, curated, best sellers, gift ready, and promotions
- REST endpoints for health, products, and content sections

## Setup

1. Copy `.env.example` to `.env`
2. Set `MONGODB_URI` to your MongoDB connection string
3. Install dependencies with `npm install`
4. Run the server with `npm run dev`

## Endpoints

- `GET /api/health`
- `GET /api/products`
- `GET /api/products/:id`
- `POST /api/products`
- `PUT /api/products/:id`
- `DELETE /api/products/:id`
- `GET /api/content-sections`
- `GET /api/content-sections/:key`
- `POST /api/content-sections`
- `PUT /api/content-sections/:key`
- `DELETE /api/content-sections/:key`

## Suggested content section keys

- `hero`
- `new-arrivals`
- `curated`
- `best-sellers`
- `gift-ready`
- `promotions`
