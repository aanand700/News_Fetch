import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from '../db/schema.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const ANONYMOUS_USER_ID = 'anonymous-user';

export interface AuthPayload {
  userId: string;
  email: string;
}

async function ensureAnonymousUser() {
  const exists = await db.prepare('SELECT 1 FROM users WHERE id = ?').get(ANONYMOUS_USER_ID);
  if (!exists) {
    await db.prepare(
      'INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)'
    ).run(ANONYMOUS_USER_ID, 'anonymous@local', crypto.randomBytes(32).toString('hex'));
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const run = async () => {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      try {
        const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
        (req as Request & { user: AuthPayload }).user = payload;
        next();
        return;
      } catch {
        // Fall through to anonymous
      }
    }
    await ensureAnonymousUser();
    (req as Request & { user: AuthPayload }).user = {
      userId: ANONYMOUS_USER_ID,
      email: 'anonymous@local',
    };
    next();
  };
  run().catch(next);
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}
