import type { Job } from 'bullmq';
import { aggregateSnapshot } from '@/lib/pipeline/snapshot-aggregator';

export async function handleSnapshotJob(
  job: Job<{ batchId: string }>,
): Promise<void> {
  const { batchId } = job.data;
  await aggregateSnapshot(batchId);
}
