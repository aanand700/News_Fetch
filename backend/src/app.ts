import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import feedsRoutes from './routes/feeds.js';
import articlesRoutes from './routes/articles.js';
import fetchRoutes from './routes/fetch.js';
import instructionsRoutes from './routes/instructions.js';
import templatesRoutes from './routes/templates.js';
import statusRoutes from './routes/status.js';
import runsRoutes from './routes/runs.js';

export function createApp() {
  const app = express();
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());

  app.use('/api/auth', authRoutes);
  app.use('/api/feeds', feedsRoutes);
  app.use('/api/articles', articlesRoutes);
  app.use('/api/fetch', fetchRoutes);
  app.use('/api/instructions', instructionsRoutes);
  app.use('/api/templates', templatesRoutes);
  app.use('/api/status', statusRoutes);
  app.use('/api/runs', runsRoutes);

  return app;
}
