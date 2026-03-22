import type { Job } from 'bullmq';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { brandMentions } from '@/lib/db/schema';
import { analyzeSentiment } from '@/lib/pipeline/sentiment-analyzer';

export async function handleSentimentJob(
  job: Job<{ brandMentionId: string }>,
): Promise<void> {
  const { brandMentionId } = job.data;

  // Load the brand mention
  const [mention] = await db
    .select()
    .from(brandMentions)
    .where(eq(brandMentions.id, brandMentionId));

  if (!mention || !mention.contextSnippet || !mention.mentioned) {
    return; // Nothing to analyze
  }

  // Classify sentiment
  const sentiment = await analyzeSentiment(mention.contextSnippet);

  // Update the brand mention with sentiment
  await db
    .update(brandMentions)
    .set({ sentiment })
    .where(eq(brandMentions.id, brandMentionId));
}
