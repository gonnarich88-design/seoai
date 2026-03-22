import { eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import {
  queryRuns,
  brandMentions,
  dailySnapshots,
} from '@/lib/db/schema';

export async function aggregateSnapshot(batchId: string): Promise<void> {
  // 1. Get all query runs in this batch
  const runs = await db
    .select()
    .from(queryRuns)
    .where(eq(queryRuns.batchId, batchId));

  if (runs.length === 0) return;

  const keywordId = runs[0].keywordId;
  const providerId = runs[0].providerId;
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // 2. Get all brand mentions for these runs
  const runIds = runs.map((r) => r.id);
  const mentions = await db
    .select()
    .from(brandMentions)
    .where(inArray(brandMentions.queryRunId, runIds));

  // 3. Group mentions by brandId
  const grouped = new Map<
    string,
    { mentioned: boolean; position: number | null }[]
  >();
  for (const m of mentions) {
    if (!grouped.has(m.brandId)) {
      grouped.set(m.brandId, []);
    }
    grouped.get(m.brandId)!.push({
      mentioned: m.mentioned,
      position: m.position,
    });
  }

  // 4. For each brand group, calculate and upsert
  for (const [brandId, brandMentionList] of grouped) {
    const mentionedCount = brandMentionList.filter((m) => m.mentioned).length;
    const mentionRate = parseFloat(
      (mentionedCount / runs.length).toFixed(4),
    );

    const positionsWithValues = brandMentionList
      .filter((m) => m.mentioned && m.position != null)
      .map((m) => m.position!);

    const avgPosition =
      positionsWithValues.length > 0
        ? parseFloat(
            (
              positionsWithValues.reduce((a, b) => a + b, 0) /
              positionsWithValues.length
            ).toFixed(2),
          )
        : null;

    await db
      .insert(dailySnapshots)
      .values({
        date: today,
        keywordId,
        brandId,
        providerId,
        mentionRate: mentionRate.toString(),
        avgPosition: avgPosition?.toString() ?? null,
        runCount: runs.length,
      })
      .onConflictDoUpdate({
        target: [
          dailySnapshots.keywordId,
          dailySnapshots.brandId,
          dailySnapshots.providerId,
          dailySnapshots.date,
        ],
        set: {
          mentionRate: mentionRate.toString(),
          avgPosition: avgPosition?.toString() ?? null,
          runCount: runs.length,
        },
      });
  }
}
