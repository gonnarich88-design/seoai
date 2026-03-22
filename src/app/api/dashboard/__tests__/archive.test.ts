import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db/client', () => ({
  db: {
    select: vi.fn(),
  },
}));

import { db } from '@/lib/db/client';
import { GET } from '@/app/api/dashboard/archive/route';

const mockDb = vi.mocked(db);

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/dashboard/archive');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return { nextUrl: url } as any;
}

function setupArchive(runs: any[], total: number) {
  // First call: paginated query runs
  const mockOffset = vi.fn().mockResolvedValue(runs);
  const mockLimit = vi.fn().mockReturnValue({ offset: mockOffset });
  const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit });
  const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
  const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });

  // Second call: count query
  const mockCountWhere = vi.fn().mockResolvedValue([{ count: total }]);
  const mockCountFrom = vi.fn().mockReturnValue({ where: mockCountWhere });

  // Third call: brand mentions for the runs
  const mockMentionsWhere = vi.fn().mockResolvedValue([]);
  const mockMentionsLeftJoin = vi.fn().mockReturnValue({ where: mockMentionsWhere });
  const mockMentionsFrom = vi.fn().mockReturnValue({ leftJoin: mockMentionsLeftJoin });

  let callCount = 0;
  mockDb.select.mockImplementation((...args: any[]) => {
    callCount++;
    if (callCount === 1) return { from: mockFrom } as any;
    if (callCount === 2) return { from: mockCountFrom } as any;
    return { from: mockMentionsFrom } as any;
  });
}

describe('GET /api/dashboard/archive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 if keyword param missing', async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('keyword param required');
  });

  it('returns paginated queryRuns with brandMentions', async () => {
    const mockRuns = [
      {
        id: 'qr-1', keywordId: 'kw-1', providerId: 'chatgpt', model: 'gpt-4o',
        prompt: 'test', promptVersion: 1, rawResponse: 'response',
        citations: [], tokensUsed: 100, costUsd: '0.001000', latencyMs: 500,
        runNumber: 1, batchId: 'batch-1', runType: 'scheduled',
        createdAt: new Date('2026-03-22'),
      },
    ];
    setupArchive(mockRuns, 1);

    const res = await GET(makeRequest({ keyword: 'kw-1' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.runs).toHaveLength(1);
    expect(json.pagination).toMatchObject({ page: 1, limit: 20, total: 1 });
  });

  it('returns pagination metadata', async () => {
    setupArchive([], 50);

    const res = await GET(makeRequest({ keyword: 'kw-1', page: '2', limit: '10' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.pagination).toMatchObject({ page: 2, limit: 10, total: 50 });
  });

  it('defaults to page=1, limit=20 when params omitted', async () => {
    setupArchive([], 0);

    const res = await GET(makeRequest({ keyword: 'kw-1' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.pagination).toMatchObject({ page: 1, limit: 20, total: 0 });
  });
});
