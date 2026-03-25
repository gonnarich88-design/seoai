import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { queryRuns } from '@/lib/db/schema';
import { inArray } from 'drizzle-orm';
import { Queue } from 'bullmq';
import { connection } from '@/lib/queue/connection';

export async function GET(request: NextRequest) {
  const param = request.nextUrl.searchParams.get('batchIds') ?? '';
  const batchIds = param.split(',').filter(Boolean);

  if (batchIds.length === 0) {
    return NextResponse.json({ error: 'batchIds required' }, { status: 400 });
  }

  // Check DB for completed runs
  const completedRuns = await db
    .select({ batchId: queryRuns.batchId })
    .from(queryRuns)
    .where(inArray(queryRuns.batchId, batchIds));

  // Check BullMQ for jobs that have exhausted all retries (truly failed)
  const queue = new Queue('seoai-jobs', { connection });
  const failedJobs = await queue.getFailed(0, 300);
  await queue.close();

  function cleanError(raw: string): string {
    const stripped = raw.replace(/^Failed after \d+ attempts\. Last error: /, '');
    const firstLine = stripped.split('\n')[0];
    return firstLine.split(/\.\s+For\b/)[0].split(/\.\s+To\b/)[0].trim();
  }

  const failedByBatch: Record<string, { error: string; providerId: string }> = {};

  for (const job of failedJobs) {
    if (job.data?.batchId && batchIds.includes(job.data.batchId) && job.failedReason) {
      failedByBatch[job.data.batchId] = {
        error: cleanError(job.failedReason),
        providerId: job.data.providerId ?? 'unknown',
      };
    }
  }

  const batches: Record<string, { completed: number; failed: boolean; error?: string; providerId?: string }> = {};
  for (const batchId of batchIds) {
    const done = completedRuns.filter((r) => r.batchId === batchId).length;
    batches[batchId] = {
      completed: done,
      failed: !!failedByBatch[batchId] && done === 0,
      error: failedByBatch[batchId]?.error,
      providerId: failedByBatch[batchId]?.providerId,
    };
  }

  return NextResponse.json({ batches });
}
