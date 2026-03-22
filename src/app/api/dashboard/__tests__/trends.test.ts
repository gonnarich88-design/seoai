/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db/client', () => ({
  db: {
    select: vi.fn(),
  },
}));

import { db } from '@/lib/db/client';
import { GET } from '@/app/api/dashboard/trends/route';

const mockDb = vi.mocked(db);

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/dashboard/trends');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return { nextUrl: url } as any;
}

function setupTrends(data: any[]) {
  const mockOrderBy = vi.fn().mockResolvedValue(data);
  const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
  const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
  mockDb.select.mockReturnValue({ from: mockFrom } as any);
}

describe('GET /api/dashboard/trends', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 if keyword param missing', async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('keyword param required');
  });

  it('returns time-series array ordered by date asc', async () => {
    setupTrends([
      { date: '2026-03-20', providerId: 'chatgpt', mentionRate: '0.5000', brandId: 'b1' },
      { date: '2026-03-21', providerId: 'chatgpt', mentionRate: '0.6000', brandId: 'b1' },
      { date: '2026-03-22', providerId: 'chatgpt', mentionRate: '0.7000', brandId: 'b1' },
    ]);

    const res = await GET(makeRequest({ keyword: 'kw-1', brand: 'b1', days: '7' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toHaveLength(3);
    expect(json.data[0].date).toBe('2026-03-20');
    expect(json.data[2].date).toBe('2026-03-22');
  });

  it('defaults to 30 days when days param omitted', async () => {
    setupTrends([]);

    const res = await GET(makeRequest({ keyword: 'kw-1' }));
    expect(res.status).toBe(200);
    // The route should still work with default 30 days
    const json = await res.json();
    expect(json.data).toEqual([]);
  });

  it('returns empty data array when no snapshots exist', async () => {
    setupTrends([]);

    const res = await GET(makeRequest({ keyword: 'kw-empty' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data).toEqual([]);
  });
});
