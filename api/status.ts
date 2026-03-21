/**
 * Lightweight /api/status — does not load Postgres or Express.
 * Fixes 500s when DATABASE_URL is missing but OPENAI_API_KEY is set.
 */
export default function handler(req: { method?: string }, res: { statusCode: number; setHeader: (k: string, v: string) => void; end: (b: string) => void }) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.end('');
    return;
  }
  const llmConfigured = Boolean(process.env.OPENAI_API_KEY?.trim());
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.end(JSON.stringify({ llmConfigured }));
}
