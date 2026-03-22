import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('@/lib/pipeline/query-executor', () => ({
  executeQuery: vi.fn(),
}));

vi.mock('@/lib/db/client', () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
  },
}));

vi.mock('@/lib/queue/queues', () => ({
  addAnalysisJob: vi.fn(),
  addSnapshotJob: vi.fn(),
}));

import { executeQuery } from '@/lib/pipeline/query-executor';
import { db } from '@/lib/db/client';
import { addAnalysisJob, addSnapshotJob } from '@/lib/queue/queues';
import { handleQueryJob } from '../query-handler';

const mockExecuteQuery = vi.mocked(executeQuery);
const mockDb = vi.mocked(db);
const mockAddAnalysisJob = vi.mocked(addAnalysisJob);
const mockAddSnapshotJob = vi.mocked(addSnapshotJob);

const makeJob = (overrides = {}) =>
  ({
    data: {
      keywordId: 'kw-1',
      providerId: 'chatgpt' as const,
      batchId: 'batch-1',
      runNumber: 1,
      prompt: 'test prompt',
      promptVersion: 1,
      runType: 'manual' as const,
      ...overrides,
    },
  }) as any;

function setupMocks(batchCount: number) {
  mockExecuteQuery.mockResolvedValue({
    text: 'AI response text',
    promptTokens: 100,
    completionTokens: 50,
    totalTokens: 150,
    costUsd: 0.000045,
    latencyMs: 500,
    citations: ['https://example.com'],
  });

  // Mock insert().values().returning()
  const mockReturning = vi.fn().mockResolvedValue([{ id: 'qr-new-1' }]);
  const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
  mockDb.insert.mockReturnValue({ values: mockValues } as any);

  // Mock select for batch count check
  const mockWhere = vi.fn().mockResolvedValue([{ count: batchCount }]);
  const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
  mockDb.select.mockReturnValue({ from: mockFrom } as any);

  return { mockReturning, mockValues };
}

describe('handleQueryJob', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('stores raw response in queryRuns', async () => {
    const { mockValues } = setupMocks(1);

    await handleQueryJob(makeJob());

    expect(mockValues).toHaveBeenCalledOnce();
    const insertData = mockValues.mock.calls[0][0];
    expect(insertData.rawResponse).toBe('AI response text');
  });

  it('copies promptVersion from job data', async () => {
    const { mockValues } = setupMocks(1);

    await handleQueryJob(makeJob({ promptVersion: 5 }));

    const insertData = mockValues.mock.calls[0][0];
    expect(insertData.promptVersion).toBe(5);
  });

  it('calls addAnalysisJob with the new queryRun id', async () => {
    setupMocks(1);

    await handleQueryJob(makeJob());

    expect(mockAddAnalysisJob).toHaveBeenCalledWith('qr-new-1');
  });

  it('calls addSnapshotJob when batch has 3 runs', async () => {
    setupMocks(3);

    await handleQueryJob(makeJob());

    expect(mockAddSnapshotJob).toHaveBeenCalledWith('batch-1');
  });

  it('does not call addSnapshotJob when batch incomplete', async () => {
    setupMocks(2);

    await handleQueryJob(makeJob());

    expect(mockAddSnapshotJob).not.toHaveBeenCalled();
  });
});
