# Deploy to Vercel

## Prerequisites

- Neon database connected to your Vercel project (you've done this)
- Code in a Git repo (GitHub, GitLab, or Bitbucket)

## Step 1: Connect your project

1. Go to [vercel.com](https://vercel.com) → **Add New** → **Project**
2. Import your Git repository
3. Vercel will detect the Vite framework

## Step 2: Configure build

Vercel should use these settings (from `vercel.json`):

- **Build Command:** `cd backend && npm install && npm run build && cd .. && npm run build`
- **Output Directory:** `dist`
- **Framework:** Vite

## Step 3: Add environment variables

In your Vercel project → **Settings** → **Environment Variables**, add:

| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | *(from Neon)* | Auto-added when you connected Neon. If not, copy from Neon dashboard. |
| `OPENAI_API_KEY` | `sk-...` | For LLM filtering. Get from [platform.openai.com](https://platform.openai.com/api-keys) |
| `JWT_SECRET` | *(random string)* | Use a long random string for production |

If Neon added `POSTGRES_URL` instead of `DATABASE_URL`, the app supports both.

## Step 4: Connect the database to your project

1. In Vercel → **Storage** → your Neon database
2. Click **Connect Project**
3. Select your News Collection project
4. This adds the database env vars to your project

## Step 5: Deploy

1. Click **Deploy**
2. Wait for the build to complete
3. Open your app URL (e.g. `https://your-app.vercel.app`)

## Note on scheduled fetches

The "Mondays & Thursdays" scheduled fetch does **not** run on Vercel (serverless has no long-running process). Use **Run fetch now** in the app when you want to fetch. For automated fetches, you'd need an external cron (e.g. cron-job.org) to hit your `/api/fetch` endpoint.
