# Database Setup (Postgres)

The app now uses **Postgres** instead of SQLite. Follow these steps to set up a hosted database.

## Step 1: Create a Postgres database

Choose one of these free options:

### Option A: Neon (recommended for Vercel)

1. Go to [neon.tech](https://neon.tech) and sign up
2. Create a new project
3. Copy the connection string (looks like `postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`)

### Option B: Railway

1. Go to [railway.app](https://railway.app) and sign up
2. New Project → Provision PostgreSQL
3. Open the Postgres service → Variables → copy `DATABASE_URL`

### Option C: Vercel Postgres

1. In your Vercel project → Storage → Create Database → Postgres
2. Connect to your project
3. Copy `POSTGRES_URL` (or `DATABASE_URL`)

## Step 2: Configure the backend

1. Copy the example env file:
   ```bash
   cp backend/.env.example backend/.env
   ```

2. Edit `backend/.env` and set:
   ```
   DATABASE_URL=postgresql://your-connection-string-here
   ```

3. Restart the backend:
   ```bash
   cd backend && npm run dev
   ```

The schema (tables) is created automatically on first run.

## Step 3: Verify

- The backend should start without errors
- Open the app and add a feed – if it works, the database is connected
