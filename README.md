# News Collection

A multi-user RSS feed aggregator that fetches articles, reviews and ranks them. Users can add/remove feeds, manually reorder articles, and trigger fetches on demand or on schedule (Mondays & Thursdays).

## Quick Start

### 1. Install dependencies

```bash
# Frontend
npm install

# Backend
cd backend && npm install
```

### 2. Run development

**Terminal 1 – Backend:**
```bash
cd backend && npm run dev
```

**Terminal 2 – Frontend:**
```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

The frontend proxies `/api` to the backend during development.

### 3. Create an account

Open the app, click "Log in or Sign up", and create an account. Then add RSS feeds and use "Run fetch now" to fetch articles.

## Production

### Build and run

```bash
# Build frontend
npm run build

# Build backend
cd backend && npm run build

# Run backend (serves API + frontend)
cd backend && npm start
```

The backend serves the built frontend from `dist/` and the API at `/api`. Set `PORT` (default 3001) and `JWT_SECRET` in production.

### LLM-based filtering

To use your Editorial Brief for filtering and ranking (instead of generic heuristics), set:

```bash
OPENAI_API_KEY=sk-...
```

When both `OPENAI_API_KEY` and a saved Editorial Brief are present, the system will:
1. Fetch articles from your RSS feeds
2. Send them to GPT-4o-mini with your brief
3. Store only articles that match your criteria, with LLM-generated scores and rationale

Without the API key, or without an Editorial Brief, the system falls back to heuristic scoring and stores all fetched articles.

## API

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/register | No | Register (email, password) |
| POST | /api/auth/login | No | Login (email, password) |
| GET | /api/feeds | Yes | List feeds |
| POST | /api/feeds | Yes | Add feed (url, name) |
| PUT | /api/feeds/:id | Yes | Edit feed |
| DELETE | /api/feeds/:id | Yes | Remove feed |
| GET | /api/articles | Yes | List ranked articles |
| PUT | /api/articles/reorder | Yes | Reorder (articleIds) |
| POST | /api/fetch | Yes | Run RSS fetch now |

## Schedule

Articles are fetched automatically at 9:00 AM on **Mondays and Thursdays** (up to 5 per feed). Use "Run fetch now" for manual fetches.

## Tech Stack

- **Frontend:** React, TypeScript, Vite
- **Backend:** Express, TypeScript, SQLite (better-sqlite3)
- **Auth:** JWT
- **RSS:** rss-parser
- **Scheduling:** node-cron
