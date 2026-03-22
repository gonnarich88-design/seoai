import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock DB client
vi.mock('@/lib/db/client', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}));

import { db } from '@/lib/db/client';
import { aggregateSnapshot } from '../snapshot-aggregator';

const mockDb = vi.mocked(db);

describe('aggregateSnapshot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calculates mentionRate as mentions/totalRuns', async () => {
    // Mock select for queryRuns -- 3 runs in the batch
    const mockQueryRunsFrom = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([
        { id: 'qr1', keywordId: 'kw1', providerId: 'chatgpt' },
        { id: 'qr2', keywordId: 'kw1', providerId: 'chatgpt' },
        { id: 'qr3', keywordId: 'kw1', providerId: 'chatgpt' },
      ]),
    });

    // Mock select for brandMentions
    const mockBrandMentionsFrom = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([
        { brandId: 'brand1', mentioned: true, position: 1 },
        { brandId: 'brand1', mentioned: true, position: 2 },
        { brandId: 'brand1', mentioned: false, position: null },
      ]),
    });

    let callCount = 0;
    mockDb.select.mockImplementation(() => {
      callCount++;
      return {
        from: callCount === 1 ? mockQueryRunsFrom : mockBrandMentionsFrom,
      } as any;
    });

    // Mock insert chain
    const mockSet = vi.fn().mockResolvedValue(undefined);
    const mockOnConflictDoUpdate = vi.fn().mockReturnValue({ set: mockSet });
    const mockValues = vi.fn().mockReturnValue({ onConflictDoUpdate: mockOnConflictDoUpdate });
    mockDb.insert.mockReturnValue({ values: mockValues } as any);

    await aggregateSnapshot('batch-123');

    // Verify insert was called
    expect(mockDb.insert).toHaveBeenCalled();
    // Check the values passed include mentionRate = 2/3
    const valuesArg = mockValues.mock.calls[0][0];
    expect(parseFloat(valuesArg.mentionRate)).toBeCloseTo(0.6667, 3);
  });

  it('calculates avgPosition from mentioned runs only', async () => {
    const mockQueryRunsFrom = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([
        { id: 'qr1', keywordId: 'kw1', providerId: 'chatgpt' },
        { id: 'qr2', keywordId: 'kw1', providerId: 'chatgpt' },
        { id: 'qr3', keywordId: 'kw1', providerId: 'chatgpt' },
      ]),
    });

    const mockBrandMentionsFrom = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([
        { brandId: 'brand1', mentioned: true, position: 1 },
        { brandId: 'brand1', mentioned: false, position: null },
        { brandId: 'brand1', mentioned: true, position: 3 },
      ]),
    });

    let callCount = 0;
    mockDb.select.mockImplementation(() => {
      callCount++;
      return {
        from: callCount === 1 ? mockQueryRunsFrom : mockBrandMentionsFrom,
      } as any;
    });

    const mockSet = vi.fn().mockResolvedValue(undefined);
    const mockOnConflictDoUpdate = vi.fn().mockReturnValue({ set: mockSet });
    const mockValues = vi.fn().mockReturnValue({ onConflictDoUpdate: mockOnConflictDoUpdate });
    mockDb.insert.mockReturnValue({ values: mockValues } as any);

    await aggregateSnapshot('batch-456');

    const valuesArg = mockValues.mock.calls[0][0];
    expect(parseFloat(valuesArg.avgPosition)).toBeCloseTo(2.0, 1);
  });

  it('calls db.insert with onConflictDoUpdate', async () => {
    const mockQueryRunsFrom = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([
        { id: 'qr1', keywordId: 'kw1', providerId: 'chatgpt' },
      ]),
    });

    const mockBrandMentionsFrom = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([
        { brandId: 'brand1', mentioned: true, position: 1 },
      ]),
    });

    let callCount = 0;
    mockDb.select.mockImplementation(() => {
      callCount++;
      return {
        from: callCount === 1 ? mockQueryRunsFrom : mockBrandMentionsFrom,
      } as any;
    });

    const mockSet = vi.fn().mockResolvedValue(undefined);
    const mockOnConflictDoUpdate = vi.fn().mockReturnValue({ set: mockSet });
    const mockValues = vi.fn().mockReturnValue({ onConflictDoUpdate: mockOnConflictDoUpdate });
    mockDb.insert.mockReturnValue({ values: mockValues } as any);

    await aggregateSnapshot('batch-789');

    expect(mockDb.insert).toHaveBeenCalled();
    expect(mockOnConflictDoUpdate).toHaveBeenCalled();
  });
});
