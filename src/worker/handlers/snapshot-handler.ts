import type { Job } from 'bullmq';
import { eq, and } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { queryRuns, dailySnapshots } from '@/lib/db/schema';
import { aggregateSnapshot } from '@/lib/pipeline/snapshot-aggregator';
import { addAlertDetectionJob } from '@/lib/queue/queues';

export async function handleSnapshotJob(
  job: Job<{ batchId: string }>,
): Promise<void> {
  const { batchId } = job.data;
  await aggregateSnapshot(batchId);

  // After aggregation, trigger alert detection for each brand in today's snapshots
  const runs = await db
    .select()
    .from(queryRuns)
    .where(eq(queryRuns.batchId, batchId));

  if (runs.length === 0) return;

  const keywordId = runs[0].keywordId;
  const providerId = runs[0].providerId;
  const today = new Date().toISOString().slice(0, 10);

  // Find all brands that have snapshots for this keyword+provider+date
  const snapshots = await db
    .select({ brandId: dailySnapshots.brandId })
    .from(dailySnapshots)
    .where(
      and(
        eq(dailySnapshots.keywordId, keywordId),
        eq(dailySnapshots.providerId, providerId),
        eq(dailySnapshots.date, today),
      ),
    );

  for (const snap of snapshots) {
    await addAlertDetectionJob({
      keywordId,
      brandId: snap.brandId,
      providerId,
      date: today,
    });
  }
}
