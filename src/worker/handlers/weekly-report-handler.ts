import type { Job } from 'bullmq';
import { subDays, format } from 'date-fns';
import { and, gte, lte, sql, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { dailySnapshots, keywords, brands, alerts } from '@/lib/db/schema';
import { getTransporter, isEmailConfigured } from '@/lib/email/transporter';
import { renderWeeklyReport } from '@/lib/email/templates/weekly-report';

export async function handleWeeklyReportJob(job: Job): Promise<void> {
  const endDate = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  const startDate = format(subDays(new Date(), 8), 'yyyy-MM-dd');

  // Query snapshots in the 7-day range
  const snapshots = await db
    .select({
      date: dailySnapshots.date,
      keyword: keywords.label,
      brand: brands.name,
      provider: dailySnapshots.providerId,
      mentionRate: dailySnapshots.mentionRate,
      avgPosition: dailySnapshots.avgPosition,
    })
    .from(dailySnapshots)
    .leftJoin(keywords, eq(dailySnapshots.keywordId, keywords.id))
    .leftJoin(brands, eq(dailySnapshots.brandId, brands.id))
    .where(
      and(
        gte(dailySnapshots.date, startDate),
        lte(dailySnapshots.date, endDate),
      ),
    )
    .orderBy(dailySnapshots.date);

  if (snapshots.length === 0) {
    console.log('Weekly report: no data in range, skipping');
    return;
  }

  if (!isEmailConfigured()) {
    console.log('Weekly report: email not configured, skipping');
    return;
  }

  const recipientEmail = process.env.ALERT_EMAIL_TO;
  if (!recipientEmail) {
    console.log('Weekly report: ALERT_EMAIL_TO not set, skipping');
    return;
  }

  // Count alerts in the date range
  const startOfRange = new Date(`${startDate}T00:00:00Z`);
  const endOfRange = new Date(`${endDate}T23:59:59Z`);

  const alertCountResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(alerts)
    .where(
      and(
        gte(alerts.createdAt, startOfRange),
        lte(alerts.createdAt, endOfRange),
      ),
    );

  const alertCount = Number(alertCountResult[0]?.count ?? 0);

  const { subject, html } = renderWeeklyReport({
    startDate,
    endDate,
    snapshots: snapshots.map((s) => ({
      date: s.date,
      keyword: s.keyword ?? 'Unknown',
      brand: s.brand ?? 'Unknown',
      provider: s.provider,
      mentionRate: s.mentionRate ?? '0',
      avgPosition: s.avgPosition,
    })),
    alertCount,
  });

  await getTransporter().sendMail({
    from: process.env.SMTP_FROM || 'SEO AI Monitor <noreply@localhost>',
    to: recipientEmail,
    subject,
    html,
  });

  console.log(`Weekly report sent for ${startDate} to ${endDate}`);
}
