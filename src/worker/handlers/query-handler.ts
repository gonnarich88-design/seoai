import type { Job } from 'bullmq';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { queryRuns } from '@/lib/db/schema';
import { MODELS } from '@/lib/ai/providers';
import type { ProviderId } from '@/lib/ai/providers';
import { executeQuery } from '@/lib/pipeline/query-executor';
import { addAnalysisJob, addSnapshotJob } from '@/lib/queue/queues';
import type { QueryJobData } from '@/lib/queue/queues';

export async function handleQueryJob(job: Job<QueryJobData>): Promise<void> {
  const { keywordId, providerId, batchId, runNumber, prompt, promptVersion, runType } = job.data;

  // Execute the AI query
  const result = await executeQuery(providerId, prompt);

  // Store the query run
  const [queryRun] = await db.insert(queryRuns).values({
    keywordId,
    providerId,
    model: MODELS[providerId as keyof typeof MODELS],
    prompt,
    promptVersion,
    rawResponse: result.text,
    citations: result.citations,
    tokensUsed: result.totalTokens,
    costUsd: result.costUsd.toFixed(6),
    latencyMs: result.latencyMs,
    runNumber,
    batchId,
    runType,
  }).returning();

  // Trigger brand analysis for this query run
  await addAnalysisJob(queryRun.id);

  // Check if batch is complete (all 3 runs done)
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(queryRuns)
    .where(eq(queryRuns.batchId, batchId));

  if (count === 3) {
    await addSnapshotJob(batchId);
  }
}
