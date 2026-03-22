import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('@/lib/db/client', () => ({
  db: {
    select: vi.fn(),
  },
}));

vi.mock('@/lib/queue/queues', () => ({
  addQueryJobs: vi.fn(),
}));

vi.mock('@/lib/pipeline/budget-checker', () => ({
  checkBudget: vi.fn(),
}));

import { db } from '@/lib/db/client';
import { addQueryJobs } from '@/lib/queue/queues';
import { checkBudget } from '@/lib/pipeline/budget-checker';
import { POST } from '@/app/api/checks/run/route';

const mockDb = vi.mocked(db);
const mockAddQueryJobs = vi.mocked(addQueryJobs);
const mockCheckBudget = vi.mocked(checkBudget);

function makeRequest(body: unknown) {
  return {
    json: () => Promise.resolve(body),
  } as any;
}

function setupKeywordFound() {
  const mockWhere = vi.fn().mockResolvedValue([{
    id: 'kw-1',
    label: 'test keyword',
    prompt: 'test prompt',
    promptVersion: 1,
    isActive: true,
  }]);
  const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
  mockDb.select.mockReturnValue({ from: mockFrom } as any);
}

function setupKeywordNotFound() {
  const mockWhere = vi.fn().mockResolvedValue([]);
  const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
  mockDb.select.mockReturnValue({ from: mockFrom } as any);
}

describe('POST /api/checks/run', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAddQueryJobs.mockResolvedValue('batch-123');
  });

  it('returns 400 when keywordId missing', async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('keywordId is required');
  });

  it('returns 404 when keyword not found', async () => {
    setupKeywordNotFound();

    const res = await POST(makeRequest({ keywordId: 'nonexistent' }));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe('Keyword not found');
  });

  it('returns 200 and enqueues jobs for all 3 providers', async () => {
    setupKeywordFound();
    mockCheckBudget.mockResolvedValue(true);

    const res = await POST(makeRequest({ keywordId: 'kw-1' }));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.results).toHaveLength(3);
    expect(json.results.every((r: any) => r.status === 'queued')).toBe(true);
    expect(mockAddQueryJobs).toHaveBeenCalledTimes(3);
  });

  it('returns 200 with partial budget_exceeded', async () => {
    setupKeywordFound();
    // chatgpt exceeded, perplexity and gemini ok
    mockCheckBudget
      .mockResolvedValueOnce(false)   // chatgpt
      .mockResolvedValueOnce(true)    // perplexity
      .mockResolvedValueOnce(true);   // gemini

    const res = await POST(makeRequest({ keywordId: 'kw-1' }));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.results).toHaveLength(3);
    expect(json.results[0]).toMatchObject({ providerId: 'chatgpt', status: 'budget_exceeded' });
    expect(json.results[1]).toMatchObject({ providerId: 'perplexity', status: 'queued' });
    expect(json.results[2]).toMatchObject({ providerId: 'gemini', status: 'queued' });
    expect(mockAddQueryJobs).toHaveBeenCalledTimes(2);
  });

  it('returns 402 when all providers budget exceeded', async () => {
    setupKeywordFound();
    mockCheckBudget.mockResolvedValue(false);

    const res = await POST(makeRequest({ keywordId: 'kw-1' }));
    expect(res.status).toBe(402);

    const json = await res.json();
    expect(json.error).toBe('Budget exceeded for all providers');
    expect(json.results.every((r: any) => r.status === 'budget_exceeded')).toBe(true);
    expect(mockAddQueryJobs).not.toHaveBeenCalled();
  });

  it("uses runType: 'manual' for on-demand checks", async () => {
    setupKeywordFound();
    mockCheckBudget.mockResolvedValue(true);

    await POST(makeRequest({ keywordId: 'kw-1' }));

    expect(mockAddQueryJobs).toHaveBeenCalledWith(
      expect.objectContaining({ runType: 'manual' }),
    );
  });
});
