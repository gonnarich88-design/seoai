import { NextRequest, NextResponse } from 'next/server';
import { eq, desc, inArray } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { alerts, keywords, brands } from '@/lib/db/schema';

export async function GET(request: NextRequest) {
  const limit = Number(request.nextUrl.searchParams.get('limit') || '50');
  const unreadOnly = request.nextUrl.searchParams.get('unreadOnly') === 'true';

  let query = db
    .select({
      alert: alerts,
      keyword: { id: keywords.id, label: keywords.label },
      brand: { id: brands.id, name: brands.name },
    })
    .from(alerts)
    .leftJoin(keywords, eq(alerts.keywordId, keywords.id))
    .leftJoin(brands, eq(alerts.brandId, brands.id))
    .orderBy(desc(alerts.createdAt))
    .limit(limit);

  if (unreadOnly) {
    query = query.where(eq(alerts.isRead, false)) as typeof query;
  }

  const rows = await query;

  return NextResponse.json({ alerts: rows });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { alertIds } = body as { alertIds: string[] };

  if (!alertIds || !Array.isArray(alertIds) || alertIds.length === 0) {
    return NextResponse.json(
      { error: 'alertIds array required' },
      { status: 400 },
    );
  }

  await db
    .update(alerts)
    .set({ isRead: true })
    .where(inArray(alerts.id, alertIds));

  return NextResponse.json({ success: true });
}
