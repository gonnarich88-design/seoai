import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock DB client
vi.mock('@/lib/db/client', () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
  },
}));

import { db } from '@/lib/db/client';

const mockDb = vi.mocked(db);

// Import route handlers
import { GET, PATCH } from '../route';
import { NextRequest } from 'next/server';

describe('alerts API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET returns alerts array', async () => {
    const mockAlerts = [
      {
        alert: { id: 'a1', alertType: 'brand_appeared', isRead: false },
        keyword: { id: 'kw1', label: 'test keyword' },
        brand: { id: 'b1', name: 'Test Brand' },
      },
    ];

    const mockLimit = vi.fn().mockResolvedValue(mockAlerts);
    const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit, where: vi.fn().mockReturnValue({ limit: mockLimit }) });
    const mockLeftJoin2 = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
    const mockLeftJoin1 = vi.fn().mockReturnValue({ leftJoin: mockLeftJoin2 });
    const mockFrom = vi.fn().mockReturnValue({ leftJoin: mockLeftJoin1 });

    mockDb.select.mockReturnValue({ from: mockFrom } as any);

    const request = new NextRequest('http://localhost:3000/api/alerts');
    const response = await GET(request);
    const data = await response.json();

    expect(data.alerts).toHaveLength(1);
    expect(data.alerts[0].alert.alertType).toBe('brand_appeared');
  });

  it('PATCH marks alerts as read', async () => {
    const mockWhere = vi.fn().mockResolvedValue(undefined);
    const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
    mockDb.update.mockReturnValue({ set: mockSet } as any);

    const request = new NextRequest('http://localhost:3000/api/alerts', {
      method: 'PATCH',
      body: JSON.stringify({ alertIds: ['a1', 'a2'] }),
    });
    const response = await PATCH(request);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(mockDb.update).toHaveBeenCalled();
  });

  it('PATCH returns 400 when alertIds missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/alerts', {
      method: 'PATCH',
      body: JSON.stringify({}),
    });
    const response = await PATCH(request);

    expect(response.status).toBe(400);
  });
});
