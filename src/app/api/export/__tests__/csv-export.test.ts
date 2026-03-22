/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Unit tests for serializeCsv ────────────────────────────────────

import { serializeCsv } from '@/lib/export/csv-serializer';

describe('serializeCsv', () => {
  it('serializes headers and rows into CSV', () => {
    const result = serializeCsv({
      headers: ['A', 'B'],
      rows: [{ A: '1', B: '2' }],
    });
    expect(result).toBe('A,B\n"1","2"');
  });

  it('escapes double quotes by doubling them', () => {
    const result = serializeCsv({
      headers: ['Name'],
      rows: [{ Name: 'say "hi"' }],
    });
    expect(result).toBe('Name\n"say ""hi"""');
  });

  it('handles null and undefined values as empty strings', () => {
    const result = serializeCsv({
      headers: ['A', 'B'],
      rows: [{ A: null, B: undefined }],
    });
    expect(result).toBe('A,B\n"",""');
  });

  it('handles multiple rows', () => {
    const result = serializeCsv({
      headers: ['X', 'Y'],
      rows: [
        { X: 'a', Y: 'b' },
        { X: 'c', Y: 'd' },
      ],
    });
    expect(result).toBe('X,Y\n"a","b"\n"c","d"');
  });

  it('handles commas inside field values', () => {
    const result = serializeCsv({
      headers: ['Note'],
      rows: [{ Note: 'hello, world' }],
    });
    expect(result).toBe('Note\n"hello, world"');
  });
});

// ─── Route tests ────────────────────────────────────────────────────

vi.mock('@/lib/db/client', () => ({
  db: {
    select: vi.fn(),
  },
}));

import { db } from '@/lib/db/client';

const mockDb = vi.mocked(db);

function makeRequest(
  path: string,
  params: Record<string, string> = {},
) {
  const url = new URL(`http://localhost${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return { nextUrl: url } as any;
}

describe('GET /api/export/snapshots', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Lazy import so mock is registered first
  async function getHandler() {
    const mod = await import('@/app/api/export/snapshots/route');
    return mod.GET;
  }

  it('returns 400 if startDate or endDate missing', async () => {
    const GET = await getHandler();
    const res = await GET(makeRequest('/api/export/snapshots'));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('startDate');
    expect(json.error).toContain('endDate');
  });

  it('returns CSV with correct content-type and disposition', async () => {
    const GET = await getHandler();

    const mockOrderBy = vi.fn().mockResolvedValue([
      {
        date: '2026-03-20',
        keyword: 'best crm',
        brand: 'Acme',
        provider: 'chatgpt',
        mentionRate: '0.8000',
        avgPosition: '1.50',
        avgSentiment: '0.75',
        runCount: 3,
      },
    ]);
    const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
    const mockLeftJoin2 = vi.fn().mockReturnValue({ where: mockWhere });
    const mockLeftJoin1 = vi.fn().mockReturnValue({ leftJoin: mockLeftJoin2 });
    const mockFrom = vi.fn().mockReturnValue({ leftJoin: mockLeftJoin1 });
    mockDb.select.mockReturnValue({ from: mockFrom } as any);

    const res = await GET(
      makeRequest('/api/export/snapshots', {
        startDate: '2026-03-01',
        endDate: '2026-03-22',
      }),
    );

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/csv');
    expect(res.headers.get('Content-Disposition')).toContain('attachment');
    expect(res.headers.get('Content-Disposition')).toContain('snapshots-');
    expect(res.headers.get('Content-Disposition')).toContain('.csv');

    const text = await res.text();
    expect(text).toContain(
      'Date,Keyword,Brand,Provider,Mention Rate,Avg Position,Avg Sentiment,Run Count',
    );
    expect(text).toContain('2026-03-20');
  });
});

describe('GET /api/export/alerts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function getHandler() {
    const mod = await import('@/app/api/export/alerts/route');
    return mod.GET;
  }

  it('returns CSV with correct headers', async () => {
    const GET = await getHandler();

    const mockOrderBy = vi.fn().mockResolvedValue([
      {
        date: new Date('2026-03-20T10:00:00Z'),
        keyword: 'best crm',
        brand: 'Acme',
        alertType: 'mention_drop',
        previousValue: { rate: 0.8 },
        currentValue: { rate: 0.5 },
        isRead: false,
        notifiedAt: null,
      },
    ]);
    const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
    const mockLeftJoin2 = vi.fn().mockReturnValue({ where: mockWhere });
    const mockLeftJoin1 = vi.fn().mockReturnValue({ leftJoin: mockLeftJoin2 });
    const mockFrom = vi.fn().mockReturnValue({ leftJoin: mockLeftJoin1 });
    mockDb.select.mockReturnValue({ from: mockFrom } as any);

    const res = await GET(makeRequest('/api/export/alerts'));

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/csv');
    expect(res.headers.get('Content-Disposition')).toContain('alerts-');

    const text = await res.text();
    expect(text).toContain(
      'Date,Keyword,Brand,Alert Type,Previous Value,Current Value,Read,Notified At',
    );
    expect(text).toContain('mention_drop');
  });
});
