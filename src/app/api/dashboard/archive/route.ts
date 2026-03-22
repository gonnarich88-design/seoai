import { NextRequest, NextResponse } from 'next/server';
import { eq, desc, count, inArray } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { queryRuns, brandMentions, brands } from '@/lib/db/schema';

export async function GET(request: NextRequest) {
  const keyword = request.nextUrl.searchParams.get('keyword');
  if (!keyword) {
    return NextResponse.json(
      { error: 'keyword param required' },
      { status: 400 },
    );
  }

  const page = Math.max(1, parseInt(request.nextUrl.searchParams.get('page') ?? '1', 10));
  const limit = Math.max(1, Math.min(100, parseInt(request.nextUrl.searchParams.get('limit') ?? '20', 10)));
  const offset = (page - 1) * limit;

  // Fetch paginated query runs
  const runs = await db
    .select()
    .from(queryRuns)
    .where(eq(queryRuns.keywordId, keyword))
    .orderBy(desc(queryRuns.createdAt))
    .limit(limit)
    .offset(offset);

  // Count total
  const [{ count: total }] = await db
    .select({ count: count() })
    .from(queryRuns)
    .where(eq(queryRuns.keywordId, keyword));

  // Fetch brand mentions for retrieved runs
  let mentions: any[] = [];
  if (runs.length > 0) {
    const runIds = runs.map((r) => r.id);
    mentions = await db
      .select({
        mention: brandMentions,
        brand: { id: brands.id, name: brands.name },
      })
      .from(brandMentions)
      .leftJoin(brands, eq(brandMentions.brandId, brands.id))
      .where(inArray(brandMentions.queryRunId, runIds));
  }

  // Group mentions by queryRunId
  const mentionsByRun = new Map<string, any[]>();
  for (const m of mentions) {
    const list = mentionsByRun.get(m.mention.queryRunId) ?? [];
    list.push({
      brandId: m.mention.brandId,
      brandName: m.brand?.name ?? '',
      mentioned: m.mention.mentioned,
      position: m.mention.position,
      sentiment: m.mention.sentiment,
      isRecommended: m.mention.isRecommended,
      contextSnippet: m.mention.contextSnippet,
    });
    mentionsByRun.set(m.mention.queryRunId, list);
  }

  const runsWithMentions = runs.map((run) => ({
    ...run,
    brandMentions: mentionsByRun.get(run.id) ?? [],
  }));

  return NextResponse.json({
    runs: runsWithMentions,
    pagination: { page, limit, total: Number(total) },
  });
}
