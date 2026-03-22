import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock DB client
vi.mock('@/lib/db/client', () => ({
  db: {
    select: vi.fn(),
  },
}));

import { db } from '@/lib/db/client';
import { detectChanges } from '../change-detector';

const mockDb = vi.mocked(db);

function mockSnapshotQueries(todaySnapshot: Record<string, unknown> | null, yesterdaySnapshot: Record<string, unknown> | null, existingAlerts: unknown[] = []) {
  let callCount = 0;
  mockDb.select.mockImplementation(() => {
    callCount++;
    if (callCount === 1) {
      // Today's snapshot
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(todaySnapshot ? [todaySnapshot] : []),
        }),
      } as any;
    } else if (callCount === 2) {
      // Yesterday's snapshot
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(yesterdaySnapshot ? [yesterdaySnapshot] : []),
        }),
      } as any;
    } else {
      // Existing alerts query (duplicate check)
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(existingAlerts),
        }),
      } as any;
    }
  });
}

describe('detectChanges', () => {
  const params = {
    keywordId: 'kw1',
    brandId: 'brand1',
    providerId: 'chatgpt',
    date: '2026-03-22',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns brand_appeared when yesterday mentionRate=0 and today mentionRate>0', async () => {
    mockSnapshotQueries(
      { mentionRate: '0.5000', avgPosition: '2.00' },
      { mentionRate: '0.0000', avgPosition: null },
    );

    const alerts = await detectChanges(params);
    const appeared = alerts.find(a => a.alertType === 'brand_appeared');
    expect(appeared).toBeDefined();
    expect(appeared!.previousValue).toBe('0.0000');
    expect(appeared!.currentValue).toBe('0.5000');
  });

  it('returns brand_disappeared when yesterday mentionRate>0 and today mentionRate=0', async () => {
    mockSnapshotQueries(
      { mentionRate: '0.0000', avgPosition: null },
      { mentionRate: '0.5000', avgPosition: '2.00' },
    );

    const alerts = await detectChanges(params);
    const disappeared = alerts.find(a => a.alertType === 'brand_disappeared');
    expect(disappeared).toBeDefined();
    expect(disappeared!.previousValue).toBe('0.5000');
    expect(disappeared!.currentValue).toBe('0.0000');
  });

  it('returns rank_changed when avgPosition difference >= 2', async () => {
    mockSnapshotQueries(
      { mentionRate: '0.5000', avgPosition: '5.00' },
      { mentionRate: '0.5000', avgPosition: '2.00' },
    );

    const alerts = await detectChanges(params);
    const rankChanged = alerts.find(a => a.alertType === 'rank_changed');
    expect(rankChanged).toBeDefined();
    expect(rankChanged!.previousValue).toBe('2.00');
    expect(rankChanged!.currentValue).toBe('5.00');
  });

  it('returns visibility_changed when mentionRate difference >= 0.34', async () => {
    mockSnapshotQueries(
      { mentionRate: '0.8000', avgPosition: '2.00' },
      { mentionRate: '0.3000', avgPosition: '2.00' },
    );

    const alerts = await detectChanges(params);
    const visChanged = alerts.find(a => a.alertType === 'visibility_changed');
    expect(visChanged).toBeDefined();
    expect(visChanged!.previousValue).toBe('0.3000');
    expect(visChanged!.currentValue).toBe('0.8000');
  });

  it('returns empty array when no yesterday snapshot exists (first day)', async () => {
    mockSnapshotQueries(
      { mentionRate: '0.5000', avgPosition: '2.00' },
      null,
    );

    const alerts = await detectChanges(params);
    expect(alerts).toEqual([]);
  });

  it('returns empty array when changes are below thresholds', async () => {
    mockSnapshotQueries(
      { mentionRate: '0.5000', avgPosition: '3.00' },
      { mentionRate: '0.4000', avgPosition: '2.50' },
    );

    const alerts = await detectChanges(params);
    expect(alerts).toEqual([]);
  });

  it('skips duplicate alerts already in DB for same date', async () => {
    mockSnapshotQueries(
      { mentionRate: '0.5000', avgPosition: '2.00' },
      { mentionRate: '0.0000', avgPosition: null },
      // Existing alert of same type, created today
      [{ id: 'existing-alert', alertType: 'brand_appeared', createdAt: new Date('2026-03-22T10:00:00Z') }],
    );

    const alerts = await detectChanges(params);
    // brand_appeared should be filtered out because it already exists
    const appeared = alerts.find(a => a.alertType === 'brand_appeared');
    expect(appeared).toBeUndefined();
  });
});
