import { Router, Request, Response } from 'express';
import { db } from '../db/schema.js';
import { authMiddleware, type AuthPayload } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (req: Request, res: Response) => {
  const { userId } = (req as Request & { user: AuthPayload }).user;

  const rows = (await db
    .prepare(
      `SELECT id, run_number as runNumber, created_at as createdAt
       FROM runs WHERE user_id = ? ORDER BY run_number DESC`
    )
    .all(userId)) as { id: string; runNumber: number; createdAt: string }[];

  res.json(rows);
});

export default router;
