import { Router, Request, Response } from 'express';
import { db } from '../db/schema.js';
import { authMiddleware, type AuthPayload } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: Request, res: Response) => {
  const { userId } = (req as Request & { user: AuthPayload }).user;
  const runId = req.query.runId as string | undefined;

  let rows: {
    id: string;
    title: string;
    url: string;
    source: string;
    sourceUrl: string;
    publishedAt: string;
    excerpt: string;
    rank: number;
    reviewScore: number;
    scoringRationale: string;
  }[];

  if (runId) {
    rows = (await db
      .prepare(
        `SELECT id, title, url, source, source_url as sourceUrl, published_at as publishedAt,
                excerpt, rank, review_score as reviewScore, scoring_rationale as scoringRationale
         FROM articles WHERE user_id = ? AND run_id = ? ORDER BY rank ASC`
      )
      .all(userId, runId)) as typeof rows;
  } else {
    const latestRun = (await db
      .prepare(
        'SELECT id FROM runs WHERE user_id = ? ORDER BY run_number DESC LIMIT 1'
      )
      .get(userId)) as { id: string } | undefined;

    if (!latestRun) {
      rows = [];
    } else {
      rows = (await db
        .prepare(
          `SELECT id, title, url, source, source_url as sourceUrl, published_at as publishedAt,
                  excerpt, rank, review_score as reviewScore, scoring_rationale as scoringRationale
           FROM articles WHERE user_id = ? AND run_id = ? ORDER BY rank ASC`
        )
        .all(userId, latestRun.id)) as typeof rows;
    }
  }

  res.json(rows);
});

router.put('/reorder', async (req: Request, res: Response) => {
  const { userId } = (req as Request & { user: AuthPayload }).user;
  const { articleIds } = req.body as { articleIds: string[] };

  if (!Array.isArray(articleIds) || articleIds.length === 0) {
    res.status(400).json({ error: 'articleIds array required' });
    return;
  }

  const update = db.prepare(
    'UPDATE articles SET rank = ? WHERE id = ? AND user_id = ?'
  );

  for (let i = 0; i < articleIds.length; i++) {
    await update.run(i + 1, articleIds[i], userId);
  }

  res.json({ ok: true });
});

export default router;
