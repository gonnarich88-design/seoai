import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db/client', () => ({
  db: {
    select: vi.fn(),
  },
}));

import { db } from '@/lib/db/client';
import { GET } from '@/app/api/dashboard/overview/route';

const mockDb = vi.mocked(db);

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/dashboard/overview');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return { nextUrl: url } as any;
}

function setupSnapshots(data: any[]) {
  const mockOrderBy = vi.fn().mockResolvedValue(data);
  const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
  const mockLeftJoin = vi.fn().mockReturnValue({ where: mockWhere });
  const mockFrom = vi.fn().mockReturnValue({ leftJoin: mockLeftJoin });
  mockDb.select.mockReturnValue({ from: mockFrom } as any);
}

describe('GET /api/dashboard/overview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 if keyword param missing', async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('keyword param required');
  });

  it('returns latest snapshot per provider per brand for given keyword', async () => {
    setupSnapshots([
      {
        snapshot: {
          id: 's1', date: '2026-03-22', keywordId: 'kw-1', brandId: 'b1',
          providerId: 'chatgpt', mentionRate: '0.8000', avgPosition: '1.50',
          avgSentiment: '0.75', runCount: 3, createdAt: new Date(),
        },
        brand: { id: 'b1', name: 'Acme Corp' },
      },
      {
        snapshot: {
          id: 's2', date: '2026-03-21', keywordId: 'kw-1', brandId: 'b1',
          providerId: 'chatgpt', mentionRate: '0.7000', avgPosition: '2.00',
          avgSentiment: '0.60', runCount: 2, createdAt: new Date(),
        },
        brand: { id: 'b1', name: 'Acme Corp' },
      },
      {
        snapshot: {
          id: 's3', date: '2026-03-22', keywordId: 'kw-1', brandId: 'b2',
          providerId: 'perplexity', mentionRate: '0.5000', avgPosition: '3.00',
          avgSentiment: '0.50', runCount: 1, createdAt: new Date(),
        },
        brand: { id: 'b2', name: 'Beta Inc' },
      },
    ]);

    const res = await GET(makeRequest({ keyword: 'kw-1' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.snapshots).toHaveLength(2);
    // First occurrence of b1-chatgpt is the latest (date desc)
    expect(json.snapshots[0]).toMatchObject({
      brandName: 'Acme Corp',
      brandId: 'b1',
      providerId: 'chatgpt',
      mentionRate: '0.8000',
      date: '2026-03-22',
    });
    expect(json.snapshots[1]).toMatchObject({
      brandName: 'Beta Inc',
      brandId: 'b2',
      providerId: 'perplexity',
    });
  });

  it('returns empty snapshots array when no data exists for keyword', async () => {
    setupSnapshots([]);

    const res = await GET(makeRequest({ keyword: 'kw-empty' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.snapshots).toEqual([]);
  });
});
