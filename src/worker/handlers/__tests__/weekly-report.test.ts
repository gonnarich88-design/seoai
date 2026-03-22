import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('@/lib/db/client', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/lib/email/transporter', () => ({
  getTransporter: vi.fn(() => ({
    sendMail: vi.fn().mockResolvedValue({}),
  })),
  isEmailConfigured: vi.fn(() => true),
}));

vi.mock('@/lib/queue/queues', () => ({
  seoaiQueue: {
    upsertJobScheduler: vi.fn(),
  },
}));

import { db } from '@/lib/db/client';
import { getTransporter, isEmailConfigured } from '@/lib/email/transporter';

const mockDb = vi.mocked(db);
const mockGetTransporter = vi.mocked(getTransporter);
const mockIsEmailConfigured = vi.mocked(isEmailConfigured);

describe('renderWeeklyReport', () => {
  it('returns HTML containing section headers and data rows when given snapshots', async () => {
    const { renderWeeklyReport } = await import(
      '../../../lib/email/templates/weekly-report'
    );

    const result = renderWeeklyReport({
      startDate: '2026-03-15',
      endDate: '2026-03-21',
      snapshots: [
        {
          date: '2026-03-15',
          keyword: 'best crm',
          brand: 'Acme',
          provider: 'chatgpt',
          mentionRate: '0.75',
          avgPosition: '2.5',
        },
      ],
      alertCount: 3,
    });

    expect(result.subject).toContain('2026-03-15');
    expect(result.subject).toContain('2026-03-21');
    expect(result.html).toContain('Weekly Visibility Report');
    expect(result.html).toContain('best crm');
    expect(result.html).toContain('Acme');
    expect(result.html).toContain('chatgpt');
    expect(result.html).toContain('0.75');
  });

  it('returns HTML containing "No monitoring data" message when given empty snapshots', async () => {
    const { renderWeeklyReport } = await import(
      '../../../lib/email/templates/weekly-report'
    );

    const result = renderWeeklyReport({
      startDate: '2026-03-15',
      endDate: '2026-03-21',
      snapshots: [],
      alertCount: 0,
    });

    expect(result.html).toContain('No monitoring data');
  });
});

describe('handleWeeklyReportJob', () => {
  const mockSendMail = vi.fn().mockResolvedValue({});

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockSendMail.mockResolvedValue({});
    mockGetTransporter.mockReturnValue({ sendMail: mockSendMail } as never);
    mockIsEmailConfigured.mockReturnValue(true);
    process.env.ALERT_EMAIL_TO = 'test@example.com';
  });

  it('sends email when snapshot data exists', async () => {
    // Mock db.select chain to return snapshot data
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue([
        {
          date: '2026-03-15',
          keyword: 'best crm',
          brand: 'Acme',
          provider: 'chatgpt',
          mentionRate: '0.75',
          avgPosition: '2.5',
        },
      ]),
    };

    // First call: snapshots query; Second call: alert count query
    const selectFn = vi.fn()
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockResolvedValue([
                  {
                    date: '2026-03-15',
                    keyword: 'best crm',
                    brand: 'Acme',
                    provider: 'chatgpt',
                    mentionRate: '0.75',
                    avgPosition: '2.5',
                  },
                ]),
              }),
            }),
          }),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 3 }]),
        }),
      });

    (mockDb as unknown as { select: typeof selectFn }).select = selectFn;

    const { handleWeeklyReportJob } = await import('../weekly-report-handler');
    await handleWeeklyReportJob({ data: {} } as never);

    expect(mockSendMail).toHaveBeenCalledOnce();
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'test@example.com',
        subject: expect.stringContaining('Weekly Report'),
      }),
    );
  });

  it('skips sending when no snapshot data in range', async () => {
    const selectFn = vi.fn()
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
        }),
      });

    (mockDb as unknown as { select: typeof selectFn }).select = selectFn;

    const consoleSpy = vi.spyOn(console, 'log');
    const { handleWeeklyReportJob } = await import('../weekly-report-handler');
    await handleWeeklyReportJob({ data: {} } as never);

    expect(mockSendMail).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('no data in range'),
    );
    consoleSpy.mockRestore();
  });

  it('skips sending when email is not configured', async () => {
    mockIsEmailConfigured.mockReturnValue(false);

    const selectFn = vi.fn()
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockResolvedValue([
                  {
                    date: '2026-03-15',
                    keyword: 'best crm',
                    brand: 'Acme',
                    provider: 'chatgpt',
                    mentionRate: '0.75',
                    avgPosition: '2.5',
                  },
                ]),
              }),
            }),
          }),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 0 }]),
        }),
      });

    (mockDb as unknown as { select: typeof selectFn }).select = selectFn;

    const { handleWeeklyReportJob } = await import('../weekly-report-handler');
    await handleWeeklyReportJob({ data: {} } as never);

    expect(mockSendMail).not.toHaveBeenCalled();
  });
});
