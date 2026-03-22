import type { Job } from 'bullmq';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { queryRuns, brands, brandMentions } from '@/lib/db/schema';
import { detectBrands } from '@/lib/pipeline/brand-detector';
import { addSentimentJob } from '@/lib/queue/queues';

export async function handleAnalysisJob(
  job: Job<{ queryRunId: string }>,
): Promise<void> {
  const { queryRunId } = job.data;

  // Load the query run
  const [queryRun] = await db
    .select()
    .from(queryRuns)
    .where(eq(queryRuns.id, queryRunId));

  if (!queryRun) {
    throw new Error(`Query run ${queryRunId} not found`);
  }

  // Load all brands
  const allBrands = await db.select().from(brands);

  // Detect brand mentions in the response
  const matches = detectBrands(
    queryRun.rawResponse,
    allBrands.map((b) => ({
      id: b.id,
      name: b.name,
      aliases: b.aliases ?? [],
    })),
  );

  // Store each brand mention and trigger sentiment for mentioned brands
  for (const match of matches) {
    const [mention] = await db
      .insert(brandMentions)
      .values({
        queryRunId,
        brandId: match.brandId,
        mentioned: match.mentioned,
        position: match.position,
        contextSnippet: match.contextSnippet,
      })
      .returning();

    if (match.mentioned) {
      await addSentimentJob(mention.id);
    }
  }
}
