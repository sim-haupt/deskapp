# Pixel Desk Deployment

This repo is now split into two deploy targets:

- `frontend/` for Vercel
- `backend/` for Railway

## Railway Backend

Deploy the [`backend`](/Users/szy/Documents/GitHub/deskapp/backend) folder as its own service.

Set these environment variables:

- `ALPACA_KEY_ID`
- `ALPACA_SECRET_KEY`
- `FRONTEND_ORIGIN`

Example `FRONTEND_ORIGIN` values:

- `https://your-app.vercel.app`
- `https://your-production-domain.com`

You can also allow multiple origins with a comma-separated list:

```env
FRONTEND_ORIGIN=https://your-app.vercel.app,https://your-app-git-main-yourteam.vercel.app
```

The backend exposes:

- `GET /health`
- `GET /api/market/banner`
- `GET /api/universe?priceMin=2&priceMax=20&maxVolume=50000000&limit=8`

## Vercel Frontend

Deploy the [`frontend`](/Users/szy/Documents/GitHub/deskapp/frontend) folder as its own project.

Set this build environment variable in Vercel:

- `PIXEL_DESK_API_BASE_URL`

Example:

```env
PIXEL_DESK_API_BASE_URL=https://your-railway-service.up.railway.app
```

Vercel should use:

- Root Directory: `frontend`
- Build Command: `npm run build`
- Output Directory: `dist`

## Local Development

Backend:

```bash
cd backend
cp .env.example .env
npm start
```

Frontend build:

```bash
cd frontend
PIXEL_DESK_API_BASE_URL=http://localhost:3000 npm run build
```

Then serve `frontend/dist` with any static server, or inspect the built files before deploying to Vercel.
