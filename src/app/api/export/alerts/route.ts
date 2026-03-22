import { NextRequest } from 'next/server';
import { and, gte, lte, eq, desc } from 'drizzle-orm';
import { subDays, format } from 'date-fns';
import { db } from '@/lib/db/client';
import { alerts, keywords, brands } from '@/lib/db/schema';
import { serializeCsv } from '@/lib/export/csv-serializer';

const CSV_HEADERS = [
  'Date',
  'Keyword',
  'Brand',
  'Alert Type',
  'Previous Value',
  'Current Value',
  'Read',
  'Notified At',
] as const;

export async function GET(request: NextRequest) {
  const startParam = request.nextUrl.searchParams.get('startDate');
  const endParam = request.nextUrl.searchParams.get('endDate');

  const now = new Date();
  const startDate = startParam ?? format(subDays(now, 30), 'yyyy-MM-dd');
  const endDate = endParam ?? format(now, 'yyyy-MM-dd');

  const rows = await db
    .select({
      date: alerts.createdAt,
      keyword: keywords.label,
      brand: brands.name,
      alertType: alerts.alertType,
      previousValue: alerts.previousValue,
      currentValue: alerts.currentValue,
      isRead: alerts.isRead,
      notifiedAt: alerts.notifiedAt,
    })
    .from(alerts)
    .leftJoin(keywords, eq(alerts.keywordId, keywords.id))
    .leftJoin(brands, eq(alerts.brandId, brands.id))
    .where(
      and(
        gte(alerts.createdAt, new Date(`${startDate}T00:00:00Z`)),
        lte(alerts.createdAt, new Date(`${endDate}T23:59:59Z`)),
      ),
    )
    .orderBy(desc(alerts.createdAt));

  const csvRows = rows.map((r) => ({
    Date: r.date instanceof Date ? r.date.toISOString() : String(r.date ?? ''),
    Keyword: r.keyword,
    Brand: r.brand,
    'Alert Type': r.alertType,
    'Previous Value':
      r.previousValue != null ? JSON.stringify(r.previousValue) : '',
    'Current Value':
      r.currentValue != null ? JSON.stringify(r.currentValue) : '',
    Read: r.isRead ? 'Yes' : 'No',
    'Notified At':
      r.notifiedAt instanceof Date ? r.notifiedAt.toISOString() : (r.notifiedAt ?? ''),
  }));

  const csv = serializeCsv({ headers: [...CSV_HEADERS], rows: csvRows });
  const today = new Date().toISOString().split('T')[0];

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="alerts-${today}.csv"`,
    },
  });
}
