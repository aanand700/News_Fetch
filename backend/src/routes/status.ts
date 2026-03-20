import { Router, Request, Response } from 'express';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const llmConfigured = Boolean(process.env.OPENAI_API_KEY?.trim());
  res.json({ llmConfigured });
});

export default router;
