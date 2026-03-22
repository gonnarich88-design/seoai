import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('@/lib/queue/queues', () => ({
  seoaiQueue: {
    upsertJobScheduler: vi.fn(),
  },
}));

import { seoaiQueue } from '@/lib/queue/queues';

const mockQueue = vi.mocked(seoaiQueue);

describe('setupDailyScheduler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CHECK_SCHEDULE_CRON = '0 0 * * *';
  });

  it('calls upsertJobScheduler with daily-check-scheduler ID', async () => {
    const { setupDailyScheduler } = await import('../scheduler-setup');
    await setupDailyScheduler();

    expect(mockQueue.upsertJobScheduler).toHaveBeenCalledOnce();
    expect(mockQueue.upsertJobScheduler).toHaveBeenCalledWith(
      'daily-check-scheduler',
      expect.any(Object),
      expect.any(Object),
    );
  });

  it('uses CHECK_SCHEDULE_CRON from env', async () => {
    process.env.CHECK_SCHEDULE_CRON = '30 6 * * *';
    const { setupDailyScheduler } = await import('../scheduler-setup');
    await setupDailyScheduler();

    expect(mockQueue.upsertJobScheduler).toHaveBeenCalledWith(
      'daily-check-scheduler',
      { pattern: '30 6 * * *' },
      expect.any(Object),
    );
  });

  it("defaults to '0 0 * * *' when env not set", async () => {
    delete process.env.CHECK_SCHEDULE_CRON;
    const { setupDailyScheduler } = await import('../scheduler-setup');
    await setupDailyScheduler();

    expect(mockQueue.upsertJobScheduler).toHaveBeenCalledWith(
      'daily-check-scheduler',
      { pattern: '0 0 * * *' },
      expect.any(Object),
    );
  });

  it('sets scheduled-check job name with priority 10', async () => {
    const { setupDailyScheduler } = await import('../scheduler-setup');
    await setupDailyScheduler();

    expect(mockQueue.upsertJobScheduler).toHaveBeenCalledWith(
      'daily-check-scheduler',
      expect.any(Object),
      expect.objectContaining({
        name: 'scheduled-check',
        opts: expect.objectContaining({ priority: 10 }),
      }),
    );
  });
});
