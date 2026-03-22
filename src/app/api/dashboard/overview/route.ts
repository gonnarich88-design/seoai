import { NextRequest, NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { dailySnapshots, brands } from '@/lib/db/schema';

export async function GET(request: NextRequest) {
  const keyword = request.nextUrl.searchParams.get('keyword');
  if (!keyword) {
    return NextResponse.json(
      { error: 'keyword param required' },
      { status: 400 },
    );
  }

  const rows = await db
    .select({
      snapshot: dailySnapshots,
      brand: { id: brands.id, name: brands.name },
    })
    .from(dailySnapshots)
    .leftJoin(brands, eq(dailySnapshots.brandId, brands.id))
    .where(eq(dailySnapshots.keywordId, keyword))
    .orderBy(desc(dailySnapshots.date));

  // Deduplicate: keep only the latest date per (brandId, providerId)
  const seen = new Set<string>();
  const snapshots = [];

  for (const row of rows) {
    const key = `${row.snapshot.brandId}-${row.snapshot.providerId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    snapshots.push({
      brandName: row.brand?.name ?? '',
      brandId: row.snapshot.brandId,
      providerId: row.snapshot.providerId,
      mentionRate: row.snapshot.mentionRate,
      avgPosition: row.snapshot.avgPosition,
      avgSentiment: row.snapshot.avgSentiment,
      date: row.snapshot.date,
      runCount: row.snapshot.runCount,
    });
  }

  return NextResponse.json({ snapshots });
}
