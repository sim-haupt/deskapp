# Pixel Desk Deployment

Pixel Desk is split into two deploy targets:

- `frontend/` is a static vanilla JavaScript app built for Vercel
- `backend/` is an Express API built for Railway

## Local setup

1. Install backend dependencies:

```bash
cd backend
npm install
cp .env.example .env
```

2. Fill in the backend environment variables:

- `ALPACA_KEY_ID`
- `ALPACA_SECRET_KEY`
- `SPOTIFY_CLIENT_ID` for the Spotify search widget
- `SPOTIFY_CLIENT_SECRET` for the Spotify search widget
- `GOOGLE_CALENDAR_ICAL_URL` for the calendar widget
- `FRONTEND_ORIGINS`
- `EXTERNAL_TIMEOUT_MS` optional, defaults to `12000`

3. Start the backend:

```bash
cd backend
npm run dev
```

4. Build the frontend with the local backend URL:

```bash
cd frontend
PIXEL_DESK_API_BASE_URL=http://localhost:3000 npm run build
```

5. Serve `frontend/dist` with any static file server when you want to preview the built frontend locally.

## Environment variables

### Frontend

The frontend only needs one build-time variable:

```env
PIXEL_DESK_API_BASE_URL=https://your-backend-domain.up.railway.app
```

`frontend/.env.example` is a reference file. The current build script reads `PIXEL_DESK_API_BASE_URL` from the shell or your hosting provider's environment settings.

Recommended values:

- Local: `http://localhost:3000`
- Staging: your Railway staging URL
- Production: your Railway production URL

### Backend

The backend requires:

```env
ALPACA_KEY_ID=your_alpaca_key_id
ALPACA_SECRET_KEY=your_alpaca_secret_key
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
GOOGLE_CALENDAR_ICAL_URL=https://calendar.google.com/calendar/ical/.../basic.ics
FRONTEND_ORIGINS=https://your-app.vercel.app,https://your-preview-domain.vercel.app
EXTERNAL_TIMEOUT_MS=12000
```

Recommended values:

- Local: allow localhost origins such as `http://localhost:4173`
- Staging: include your Vercel preview URL and staging custom domain if you use one
- Production: include only the production Vercel domain and any approved preview domains you want to keep

## Vercel frontend

Deploy the `frontend/` directory as its own Vercel project.

Recommended project settings:

- Root Directory: `frontend`
- Build Command: `npm run build`
- Output Directory: `dist`

Add this environment variable in Vercel:

```env
PIXEL_DESK_API_BASE_URL=https://your-railway-service.up.railway.app
```

The repo already includes [`frontend/vercel.json`](/Users/szy/Documents/GitHub/deskapp/frontend/vercel.json).

## Railway backend

Deploy the `backend/` directory as its own Railway service.

Railway should run:

- Install: `npm install`
- Start: `npm start`

The backend listens on `0.0.0.0:$PORT`, which matches Railway’s public networking model.

Add these Railway variables:

- `ALPACA_KEY_ID`
- `ALPACA_SECRET_KEY`
- `SPOTIFY_CLIENT_ID`
- `SPOTIFY_CLIENT_SECRET`
- `GOOGLE_CALENDAR_ICAL_URL`
- `FRONTEND_ORIGINS`
- `EXTERNAL_TIMEOUT_MS` optional

The repo already includes [`backend/railway.json`](/Users/szy/Documents/GitHub/deskapp/backend/railway.json).

If Railway is pointed at the repository root instead of `backend/`, the root [`package.json`](/Users/szy/Documents/GitHub/deskapp/package.json) now includes:

- a root `start` script that runs the backend
- a root `postinstall` script that installs backend dependencies

That makes root-level Railway deployments work as a fallback, but the cleaner setup is still:

- Railway service root directory: `backend`

## Available endpoints

- `GET /health`
- `GET /api/dashboard?city=langen&priceMin=2&priceMax=20&maxVolume=50000000&limit=8`
- `GET /api/calendar/events`
- `GET /api/spotify/search?q=your-query`
- `GET /api/youtube/latest`
