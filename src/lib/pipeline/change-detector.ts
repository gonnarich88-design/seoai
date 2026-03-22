import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { dailySnapshots, alerts } from '@/lib/db/schema';
import { subDays, format } from 'date-fns';

export type AlertType =
  | 'brand_appeared'
  | 'brand_disappeared'
  | 'rank_changed'
  | 'visibility_changed';

export interface NewAlert {
  alertType: AlertType;
  previousValue: string | null;
  currentValue: string;
}

const RANK_THRESHOLD = 2;
const VISIBILITY_THRESHOLD = 0.34;

function isMentionZero(rate: string | null): boolean {
  if (!rate) return true;
  return Number(rate) === 0;
}

export async function detectChanges(params: {
  keywordId: string;
  brandId: string;
  providerId: string;
  date: string;
}): Promise<NewAlert[]> {
  const { keywordId, brandId, providerId, date } = params;
  const yesterday = format(subDays(new Date(date), 1), 'yyyy-MM-dd');

  // Fetch today's snapshot
  const todayRows = await db
    .select()
    .from(dailySnapshots)
    .where(
      and(
        eq(dailySnapshots.keywordId, keywordId),
        eq(dailySnapshots.brandId, brandId),
        eq(dailySnapshots.providerId, providerId),
        eq(dailySnapshots.date, date),
      ),
    );

  // Fetch yesterday's snapshot
  const yesterdayRows = await db
    .select()
    .from(dailySnapshots)
    .where(
      and(
        eq(dailySnapshots.keywordId, keywordId),
        eq(dailySnapshots.brandId, brandId),
        eq(dailySnapshots.providerId, providerId),
        eq(dailySnapshots.date, yesterday),
      ),
    );

  // First day -- no false alerts
  if (yesterdayRows.length === 0) return [];

  const today_snap = todayRows[0];
  const yesterday_snap = yesterdayRows[0];

  if (!today_snap) return [];

  const candidates: NewAlert[] = [];

  const todayMentionRate = today_snap.mentionRate;
  const yesterdayMentionRate = yesterday_snap.mentionRate;

  // Brand appeared: yesterday 0, today > 0
  if (isMentionZero(yesterdayMentionRate) && !isMentionZero(todayMentionRate)) {
    candidates.push({
      alertType: 'brand_appeared',
      previousValue: yesterdayMentionRate,
      currentValue: todayMentionRate!,
    });
  }

  // Brand disappeared: yesterday > 0, today 0
  if (!isMentionZero(yesterdayMentionRate) && isMentionZero(todayMentionRate)) {
    candidates.push({
      alertType: 'brand_disappeared',
      previousValue: yesterdayMentionRate,
      currentValue: todayMentionRate ?? '0',
    });
  }

  // Rank changed: avgPosition difference >= 2
  const todayPos = Number(today_snap.avgPosition || 0);
  const yesterdayPos = Number(yesterday_snap.avgPosition || 0);
  if (Math.abs(todayPos - yesterdayPos) >= RANK_THRESHOLD) {
    candidates.push({
      alertType: 'rank_changed',
      previousValue: yesterday_snap.avgPosition,
      currentValue: today_snap.avgPosition ?? '0',
    });
  }

  // Visibility changed: mentionRate difference >= 0.34
  const todayRate = Number(todayMentionRate || 0);
  const yesterdayRate = Number(yesterdayMentionRate || 0);
  if (Math.abs(todayRate - yesterdayRate) >= VISIBILITY_THRESHOLD) {
    // Don't duplicate with brand_appeared/disappeared
    const alreadyHasAppearDisappear = candidates.some(
      (a) => a.alertType === 'brand_appeared' || a.alertType === 'brand_disappeared',
    );
    if (!alreadyHasAppearDisappear) {
      candidates.push({
        alertType: 'visibility_changed',
        previousValue: yesterdayMentionRate,
        currentValue: todayMentionRate!,
      });
    }
  }

  if (candidates.length === 0) return [];

  // Check for existing alerts to prevent duplicates (same keywordId+brandId+alertType on same date)
  const existingAlerts = await db
    .select()
    .from(alerts)
    .where(
      and(
        eq(alerts.keywordId, keywordId),
        eq(alerts.brandId, brandId),
      ),
    );

  // Filter to alerts created today
  const todayDate = new Date(date);
  const todayStart = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  const existingTypes = new Set(
    existingAlerts
      .filter((a) => {
        const created = new Date(a.createdAt);
        return created >= todayStart && created < todayEnd;
      })
      .map((a) => a.alertType),
  );

  return candidates.filter((c) => !existingTypes.has(c.alertType));
}
