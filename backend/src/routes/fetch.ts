import { Router, Request, Response } from 'express';
import { authMiddleware, type AuthPayload } from '../middleware/auth.js';
import { fetchAllFeedsForUser } from '../services/fetchService.js';

const router = Router();
router.use(authMiddleware);

router.post('/', async (req: Request, res: Response) => {
  const { userId } = (req as Request & { user: AuthPayload }).user;

  try {
    const result = await fetchAllFeedsForUser(userId);
    res.json(result);
  } catch (err) {
    console.error('[Fetch] Error:', err);
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Fetch failed',
    });
  }
});

export default router;
