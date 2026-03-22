import type { Job } from 'bullmq';
import { db } from '@/lib/db/client';
import { alerts } from '@/lib/db/schema';
import { detectChanges } from '@/lib/pipeline/change-detector';
import { addAlertNotifyJob } from '@/lib/queue/queues';

export async function handleAlertDetectionJob(
  job: Job<{ keywordId: string; brandId: string; providerId: string; date: string }>,
): Promise<void> {
  const newAlerts = await detectChanges(job.data);

  for (const alert of newAlerts) {
    const [inserted] = await db
      .insert(alerts)
      .values({
        keywordId: job.data.keywordId,
        brandId: job.data.brandId,
        alertType: alert.alertType,
        previousValue: alert.previousValue,
        currentValue: alert.currentValue,
      })
      .returning();

    await addAlertNotifyJob({ alertId: inserted.id });
  }

  console.log(
    `Alert detection: ${newAlerts.length} alerts for ${job.data.providerId}`,
  );
}
