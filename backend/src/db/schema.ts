import crypto from 'crypto';
import { db, query, queryOne, run } from './client.js';

const ANONYMOUS_USER_ID = 'anonymous-user';

export { db, query, queryOne, run };

export async function initSchema() {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS feeds (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      url TEXT NOT NULL,
      name TEXT NOT NULL,
      added_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_feeds_user_url ON feeds(user_id, url);

    CREATE TABLE IF NOT EXISTS runs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      run_number INTEGER NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_runs_user ON runs(user_id);

    CREATE TABLE IF NOT EXISTS articles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      feed_id TEXT NOT NULL,
      run_id TEXT REFERENCES runs(id),
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      source TEXT NOT NULL,
      source_url TEXT NOT NULL,
      published_at TEXT NOT NULL,
      excerpt TEXT,
      rank INTEGER NOT NULL,
      review_score REAL NOT NULL,
      scoring_rationale TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (feed_id) REFERENCES feeds(id)
    );

    CREATE INDEX IF NOT EXISTS idx_articles_user ON articles(user_id);
    CREATE INDEX IF NOT EXISTS idx_articles_run ON articles(run_id);

    CREATE TABLE IF NOT EXISTS user_instructions (
      user_id TEXT PRIMARY KEY,
      instruction_text TEXT NOT NULL DEFAULT '',
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS editorial_templates (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      instruction_text TEXT NOT NULL DEFAULT '',
      articles_per_feed INTEGER DEFAULT 5,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_editorial_templates_user ON editorial_templates(user_id);
  `);

  // Add articles_per_feed to user_instructions if missing (migration)
  const hasCol = await queryOne(
    `SELECT 1 FROM information_schema.columns 
     WHERE table_name = 'user_instructions' AND column_name = 'articles_per_feed'`
  );
  if (!hasCol) {
    try {
      await db.exec('ALTER TABLE user_instructions ADD COLUMN articles_per_feed INTEGER DEFAULT 5');
    } catch {
      // Column may already exist
    }
  }

  // Migrate articles without run_id: create a run and assign them
  const hasNullRun = await queryOne('SELECT 1 FROM articles WHERE run_id IS NULL LIMIT 1');
  if (hasNullRun) {
    const usersWithArticles = await query<{ user_id: string }>(
      'SELECT DISTINCT user_id FROM articles WHERE run_id IS NULL'
    );
    for (const { user_id } of usersWithArticles) {
  const maxRun = await queryOne<{ m: number }>(
    'SELECT COALESCE(MAX(run_number), 0)::int as m FROM runs WHERE user_id = ?',
    [user_id]
  );
      const runNumber = (maxRun?.m ?? 0) + 1;
      const runId = crypto.randomUUID();
      await run('INSERT INTO runs (id, user_id, run_number) VALUES (?, ?, ?)', [
        runId,
        user_id,
        runNumber,
      ]);
      await run('UPDATE articles SET run_id = ? WHERE user_id = ? AND run_id IS NULL', [
        runId,
        user_id,
      ]);
    }
  }
}
