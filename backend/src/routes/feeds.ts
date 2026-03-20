import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db/schema.js';
import { authMiddleware, type AuthPayload } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: Request, res: Response) => {
  const { userId } = (req as Request & { user: AuthPayload }).user;
  const feeds = (await db
    .prepare('SELECT id, url, name, added_at as addedAt FROM feeds WHERE user_id = ? ORDER BY added_at')
    .all(userId)) as { id: string; url: string; name: string; addedAt: string }[];

  res.json(feeds);
});

router.post('/', async (req: Request, res: Response) => {
  const { userId } = (req as Request & { user: AuthPayload }).user;
  const { url, name } = req.body;

  if (!url?.trim()) {
    res.status(400).json({ error: 'URL required' });
    return;
  }

  const trimmedUrl = url.trim();
  let trimmedName = name?.trim();
  if (!trimmedName) {
    try {
      trimmedName = new URL(trimmedUrl).hostname.replace(/^www\./, '');
    } catch {
      trimmedName = 'Unknown Source';
    }
  }

  const existing = await db
    .prepare('SELECT id FROM feeds WHERE user_id = ? AND url = ?')
    .get(userId, trimmedUrl);
  if (existing) {
    res.status(400).json({ error: 'Feed already added' });
    return;
  }

  const id = crypto.randomUUID();
  await db.prepare(
    'INSERT INTO feeds (id, user_id, url, name) VALUES (?, ?, ?, ?)'
  ).run(id, userId, trimmedUrl, trimmedName);

  res.status(201).json({
    id,
    url: trimmedUrl,
    name: trimmedName,
    addedAt: new Date().toISOString(),
  });
});

router.put('/:id', async (req: Request, res: Response) => {
  const { userId } = (req as Request & { user: AuthPayload }).user;
  const { id } = req.params;
  const { url, name } = req.body;

  const feed = await db
    .prepare('SELECT id FROM feeds WHERE id = ? AND user_id = ?')
    .get(id, userId);
  if (!feed) {
    res.status(404).json({ error: 'Feed not found' });
    return;
  }

  const trimmedUrl = url?.trim();
  const trimmedName = name?.trim();

  if (trimmedUrl) {
    const other = await db
      .prepare('SELECT id FROM feeds WHERE user_id = ? AND url = ? AND id != ?')
      .get(userId, trimmedUrl, id);
    if (other) {
      res.status(400).json({ error: 'URL already used by another feed' });
      return;
    }
    await db.prepare('UPDATE feeds SET url = ? WHERE id = ?').run(trimmedUrl, id);
  }
  if (trimmedName !== undefined) {
    await db.prepare('UPDATE feeds SET name = ? WHERE id = ?').run(trimmedName, id);
  }

  const updated = (await db
    .prepare('SELECT id, url, name, added_at as addedAt FROM feeds WHERE id = ?')
    .get(id)) as { id: string; url: string; name: string; addedAt: string };

  res.json(updated);
});

router.delete('/:id', async (req: Request, res: Response) => {
  const { userId } = (req as Request & { user: AuthPayload }).user;
  const { id } = req.params;

  const result = await db.prepare('DELETE FROM feeds WHERE id = ? AND user_id = ?').run(id, userId);
  if (result.changes === 0) {
    res.status(404).json({ error: 'Feed not found' });
    return;
  }

  await db.prepare('DELETE FROM articles WHERE feed_id = ?').run(id);
  res.status(204).send();
});

export default router;
