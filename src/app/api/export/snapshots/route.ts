import { NextRequest, NextResponse } from 'next/server';
import { and, gte, lte, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { dailySnapshots, keywords, brands } from '@/lib/db/schema';
import { serializeCsv } from '@/lib/export/csv-serializer';

const CSV_HEADERS = [
  'Date',
  'Keyword',
  'Brand',
  'Provider',
  'Mention Rate',
  'Avg Position',
  'Avg Sentiment',
  'Run Count',
] as const;

export async function GET(request: NextRequest) {
  const startDate = request.nextUrl.searchParams.get('startDate');
  const endDate = request.nextUrl.searchParams.get('endDate');

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: 'startDate and endDate query params are required' },
      { status: 400 },
    );
  }

  const rows = await db
    .select({
      date: dailySnapshots.date,
      keyword: keywords.label,
      brand: brands.name,
      provider: dailySnapshots.providerId,
      mentionRate: dailySnapshots.mentionRate,
      avgPosition: dailySnapshots.avgPosition,
      avgSentiment: dailySnapshots.avgSentiment,
      runCount: dailySnapshots.runCount,
    })
    .from(dailySnapshots)
    .leftJoin(keywords, eq(dailySnapshots.keywordId, keywords.id))
    .leftJoin(brands, eq(dailySnapshots.brandId, brands.id))
    .where(and(gte(dailySnapshots.date, startDate), lte(dailySnapshots.date, endDate)))
    .orderBy(dailySnapshots.date);

  const csvRows = rows.map((r) => ({
    Date: r.date,
    Keyword: r.keyword,
    Brand: r.brand,
    Provider: r.provider,
    'Mention Rate': r.mentionRate,
    'Avg Position': r.avgPosition,
    'Avg Sentiment': r.avgSentiment,
    'Run Count': r.runCount,
  }));

  const csv = serializeCsv({ headers: [...CSV_HEADERS], rows: csvRows });
  const today = new Date().toISOString().split('T')[0];

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="snapshots-${today}.csv"`,
    },
  });
}
