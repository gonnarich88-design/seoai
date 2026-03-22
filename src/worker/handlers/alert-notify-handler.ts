import type { Job } from 'bullmq';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { alerts, keywords, brands } from '@/lib/db/schema';
import { getTransporter, isEmailConfigured } from '@/lib/email/transporter';
import { renderAlertEmail } from '@/lib/email/templates/alert-notification';

export async function handleAlertNotifyJob(
  job: Job<{ alertId: string }>,
): Promise<void> {
  const rows = await db
    .select({
      alert: alerts,
      keyword: { label: keywords.label },
      brand: { name: brands.name },
    })
    .from(alerts)
    .leftJoin(keywords, eq(alerts.keywordId, keywords.id))
    .leftJoin(brands, eq(alerts.brandId, brands.id))
    .where(eq(alerts.id, job.data.alertId));

  if (rows.length === 0) {
    console.log(`Alert ${job.data.alertId} not found, skipping notification`);
    return;
  }

  const { alert, keyword, brand } = rows[0];

  if (!isEmailConfigured()) {
    console.log('SMTP not configured, skipping email notification');
    return;
  }

  const recipient = process.env.ALERT_EMAIL_TO;
  if (!recipient) {
    console.log('ALERT_EMAIL_TO not set, skipping email notification');
    return;
  }

  const { subject, html } = renderAlertEmail({
    alertType: alert.alertType,
    brandName: brand?.name ?? 'Unknown Brand',
    keywordLabel: keyword?.label ?? 'Unknown Keyword',
    previousValue: alert.previousValue as string | null,
    currentValue: alert.currentValue as string,
    providerId: 'N/A',
  });

  // Send email -- if this throws, BullMQ will retry (notifiedAt NOT set)
  await getTransporter().sendMail({
    from: process.env.SMTP_FROM || 'SEO AI Monitor <noreply@localhost>',
    to: recipient,
    subject,
    html,
  });

  // Only set notifiedAt after successful delivery
  await db
    .update(alerts)
    .set({ notifiedAt: new Date() })
    .where(eq(alerts.id, job.data.alertId));

  console.log(`Email notification sent for alert ${job.data.alertId}`);
}
