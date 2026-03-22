import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('@/lib/db/client', () => ({
  db: {
    select: vi.fn(),
  },
}));

import { db } from '@/lib/db/client';

const mockDb = vi.mocked(db);

function setupDbMock(total: string) {
  const mockWhere = vi.fn().mockResolvedValue([{ total }]);
  const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
  mockDb.select.mockReturnValue({ from: mockFrom } as any);
}

describe('checkBudget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set default budget env vars
    process.env.DAILY_BUDGET_OPENAI = '1.0';
    process.env.DAILY_BUDGET_PERPLEXITY = '1.0';
    process.env.DAILY_BUDGET_GEMINI = '1.0';
  });

  it('returns true when no spend today', async () => {
    setupDbMock('0');
    const { checkBudget } = await import('../budget-checker');
    const result = await checkBudget('chatgpt');
    expect(result).toBe(true);
  });

  it('returns true when spend under cap', async () => {
    setupDbMock('0.50');
    const { checkBudget } = await import('../budget-checker');
    const result = await checkBudget('chatgpt');
    expect(result).toBe(true);
  });

  it('returns false when spend at cap', async () => {
    setupDbMock('1.00');
    const { checkBudget } = await import('../budget-checker');
    const result = await checkBudget('chatgpt');
    expect(result).toBe(false);
  });

  it('returns false when spend exceeds cap', async () => {
    setupDbMock('1.50');
    const { checkBudget } = await import('../budget-checker');
    const result = await checkBudget('chatgpt');
    expect(result).toBe(false);
  });
});

describe('getBudgetCap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DAILY_BUDGET_OPENAI = '2.5';
    process.env.DAILY_BUDGET_PERPLEXITY = '3.0';
    process.env.DAILY_BUDGET_GEMINI = '1.5';
  });

  it('returns env value for chatgpt', async () => {
    const { getBudgetCap } = await import('../budget-checker');
    expect(getBudgetCap('chatgpt')).toBe(2.5);
  });

  it('maps provider IDs correctly', async () => {
    const { getBudgetCap } = await import('../budget-checker');
    expect(getBudgetCap('chatgpt')).toBe(2.5);     // DAILY_BUDGET_OPENAI
    expect(getBudgetCap('perplexity')).toBe(3.0);   // DAILY_BUDGET_PERPLEXITY
    expect(getBudgetCap('gemini')).toBe(1.5);        // DAILY_BUDGET_GEMINI
  });

  it('defaults to 1.0 when env not set', async () => {
    delete process.env.DAILY_BUDGET_OPENAI;
    const { getBudgetCap } = await import('../budget-checker');
    expect(getBudgetCap('chatgpt')).toBe(1.0);
  });
});
