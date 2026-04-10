# Pixel Desk

Pixel Desk is a retro-style market dashboard with:

- Berlin and New York clocks
- market session timing
- city-based weather
- delayed Alpaca market quotes
- a lightweight screened equity universe

## Repo layout

```text
frontend/   Static vanilla JS frontend for Vercel
backend/    Express API for Railway
```

## Why this structure

- The frontend stays framework-free and easy to read.
- The backend owns all third-party API calls and secrets.
- The browser only talks to one API, which simplifies CORS, deployment, and troubleshooting.

## Helpful commands

From the repo root:

```bash
npm run build:frontend
npm run check:backend
npm run dev:backend
```

Detailed setup and deployment steps live in [`DEPLOY.md`](/Users/szy/Documents/GitHub/deskapp/DEPLOY.md).
