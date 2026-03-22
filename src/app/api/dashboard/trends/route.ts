import { NextRequest, NextResponse } from 'next/server';
import { eq, and, gte, asc } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { dailySnapshots } from '@/lib/db/schema';

export async function GET(request: NextRequest) {
  const keyword = request.nextUrl.searchParams.get('keyword');
  if (!keyword) {
    return NextResponse.json(
      { error: 'keyword param required' },
      { status: 400 },
    );
  }

  const brand = request.nextUrl.searchParams.get('brand');
  const days = parseInt(request.nextUrl.searchParams.get('days') ?? '30', 10);

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const cutoff = cutoffDate.toISOString().split('T')[0];

  const conditions = [
    eq(dailySnapshots.keywordId, keyword),
    gte(dailySnapshots.date, cutoff),
  ];

  if (brand) {
    conditions.push(eq(dailySnapshots.brandId, brand));
  }

  const data = await db
    .select({
      date: dailySnapshots.date,
      providerId: dailySnapshots.providerId,
      mentionRate: dailySnapshots.mentionRate,
      brandId: dailySnapshots.brandId,
    })
    .from(dailySnapshots)
    .where(and(...conditions))
    .orderBy(asc(dailySnapshots.date));

  return NextResponse.json({ data });
}
