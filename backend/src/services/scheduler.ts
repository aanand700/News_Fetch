import cron from 'node-cron';
import { db } from '../db/schema.js';
import { fetchAllFeedsForUser } from './fetchService.js';

// Run at 9:00 AM on Mondays and Thursdays
const CRON_SCHEDULE = '0 9 * * 1,4';

export function startScheduler() {
  cron.schedule(CRON_SCHEDULE, async () => {
    console.log('[Scheduler] Running scheduled fetch...');
    const users = (await db.prepare('SELECT id FROM users').all()) as { id: string }[];

    for (const user of users) {
      try {
        const { added, errors } = await fetchAllFeedsForUser(user.id);
        console.log(`[Scheduler] User ${user.id}: added ${added} articles`);
        if (errors.length > 0) {
          console.warn(`[Scheduler] User ${user.id} errors:`, errors);
        }
      } catch (err) {
        console.error(`[Scheduler] User ${user.id} failed:`, err);
      }
    }
  });

  console.log(`[Scheduler] Started. Next runs: Mondays & Thursdays at 9:00 AM`);
}
