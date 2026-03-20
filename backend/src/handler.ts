import type { Request, Response } from 'express';
import { createApp } from './app.js';
import { initSchema } from './db/schema.js';

let appPromise: Promise<ReturnType<typeof createApp>> | null = null;

async function getApp() {
  if (!appPromise) {
    appPromise = initSchema().then(() => createApp());
  }
  return appPromise;
}

export default async function handler(req: Request, res: Response) {
  const app = await getApp();
  app(req, res);
}
