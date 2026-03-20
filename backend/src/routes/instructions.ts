import { Router, Request, Response } from 'express';
import { db } from '../db/schema.js';
import { authMiddleware, type AuthPayload } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: Request, res: Response) => {
  const { userId } = (req as Request & { user: AuthPayload }).user;

  const row = (await db
    .prepare('SELECT instruction_text as instructionText, updated_at as updatedAt FROM user_instructions WHERE user_id = ?')
    .get(userId)) as { instructionText: string; updatedAt: string } | undefined;

  res.json({
    instructionText: row?.instructionText ?? '',
    updatedAt: row?.updatedAt ?? null,
  });
});

router.put('/', async (req: Request, res: Response) => {
  const { userId } = (req as Request & { user: AuthPayload }).user;
  const { instructionText } = req.body as { instructionText?: string };

  const text = typeof instructionText === 'string' ? instructionText : '';

  await db.prepare(
    `INSERT INTO user_instructions (user_id, instruction_text, updated_at)
     VALUES (?, ?, NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       instruction_text = excluded.instruction_text,
       updated_at = NOW()`
  ).run(userId, text);

  const row = (await db
    .prepare('SELECT instruction_text as instructionText, updated_at as updatedAt FROM user_instructions WHERE user_id = ?')
    .get(userId)) as { instructionText: string; updatedAt: string };

  res.json(row);
});

export default router;
