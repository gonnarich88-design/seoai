import { seoaiQueue } from '@/lib/queue/queues';

export async function setupDailyScheduler() {
  const cronPattern = process.env.CHECK_SCHEDULE_CRON || '0 0 * * *';

  await seoaiQueue.upsertJobScheduler(
    'daily-check-scheduler',
    { pattern: cronPattern },
    {
      name: 'scheduled-check',
      data: { type: 'daily' },
      opts: {
        priority: 10, // lower priority than manual checks (priority: 1)
      },
    },
  );

  console.log(`Daily scheduler configured with cron: ${cronPattern}`);
}
