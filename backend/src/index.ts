import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createApp } from './app.js';
import { startScheduler } from './services/scheduler.js';
import { initSchema } from './db/schema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || '3001', 10);

async function main() {
  await initSchema();

  const app = createApp();

  // Serve frontend in production (when dist exists)
  const distPath = path.join(__dirname, '../../dist');
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (!process.env.VERCEL) {
    startScheduler();
  }

  app.listen(PORT, () => {
    const llmStatus = process.env.OPENAI_API_KEY ? 'LLM configured' : 'LLM not configured (set OPENAI_API_KEY)';
    console.log(`News Collection API running on http://localhost:${PORT}`);
    console.log(`  ${llmStatus}`);
  });
}

main().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
