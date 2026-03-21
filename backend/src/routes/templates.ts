import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db/schema.js';
import { authMiddleware, type AuthPayload } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: Request, res: Response) => {
  const { userId } = (req as Request & { user: AuthPayload }).user;

  const rows = (await db
    .prepare(
      `SELECT id, name, instruction_text as instructionText, created_at as createdAt
       FROM editorial_templates WHERE user_id = ? ORDER BY created_at ASC`
    )
    .all(userId)) as {
    id: string;
    name: string;
    instructionText: string;
    createdAt: string;
  }[];

  res.json(rows);
});

router.post('/', async (req: Request, res: Response) => {
  const { userId } = (req as Request & { user: AuthPayload }).user;
  const { name, instructionText } = req.body as { name?: string; instructionText?: string };

  const templateName = typeof name === 'string' && name.trim() ? name.trim() : 'Untitled';
  const text = typeof instructionText === 'string' ? instructionText : '';

  const id = crypto.randomUUID();
  await db.prepare(
    `INSERT INTO editorial_templates (id, user_id, name, instruction_text)
     VALUES (?, ?, ?, ?)`
  ).run(id, userId, templateName, text);

  const row = (await db
    .prepare(
      `SELECT id, name, instruction_text as instructionText, created_at as createdAt
       FROM editorial_templates WHERE id = ?`
    )
    .get(id)) as {
    id: string;
    name: string;
    instructionText: string;
    createdAt: string;
  };

  res.status(201).json(row);
});

router.put('/:id', async (req: Request, res: Response) => {
  const { userId } = (req as Request & { user: AuthPayload }).user;
  const { id } = req.params;
  const { name, instructionText } = req.body as { name?: string; instructionText?: string };

  const existing = await db
    .prepare('SELECT id FROM editorial_templates WHERE id = ? AND user_id = ?')
    .get(id, userId);

  if (!existing) {
    res.status(404).json({ error: 'Template not found' });
    return;
  }

  const templateName = typeof name === 'string' && name.trim() ? name.trim() : undefined;
  const text = typeof instructionText === 'string' ? instructionText : undefined;

  const updates: string[] = [];
  const values: (string | number)[] = [];

  if (templateName !== undefined) {
    updates.push('name = ?');
    values.push(templateName);
  }
  if (text !== undefined) {
    updates.push('instruction_text = ?');
    values.push(text);
  }

  if (updates.length > 0) {
    values.push(id, userId);
    await db.prepare(
      `UPDATE editorial_templates SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`
    ).run(...values);
  }

  const row = (await db
    .prepare(
      `SELECT id, name, instruction_text as instructionText, created_at as createdAt
       FROM editorial_templates WHERE id = ? AND user_id = ?`
    )
    .get(id, userId)) as {
    id: string;
    name: string;
    instructionText: string;
    createdAt: string;
  };

  res.json(row);
});

router.delete('/:id', async (req: Request, res: Response) => {
  const { userId } = (req as Request & { user: AuthPayload }).user;
  const { id } = req.params;

  // Use RETURNING instead of relying on rowCount — some pg/Neon paths report rowCount as 0
  // even when rows were deleted, which made deletes look failed and the UI never refresh.
  const removed = (await db
    .prepare('DELETE FROM editorial_templates WHERE id = ? AND user_id = ? RETURNING id')
    .all(id, userId)) as { id: string }[];

  if (removed.length === 0) {
    res.status(404).json({ error: 'Template not found' });
    return;
  }

  res.status(204).send();
});

export default router;
