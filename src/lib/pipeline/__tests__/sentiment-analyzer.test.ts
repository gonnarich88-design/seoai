import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('ai', () => ({
  generateText: vi.fn(),
}));

import { generateText } from 'ai';
import { analyzeSentiment } from '../sentiment-analyzer';

const mockGenerateText = vi.mocked(generateText);

describe('analyzeSentiment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 'positive' for positive context", async () => {
    mockGenerateText.mockResolvedValueOnce({ text: 'positive' } as any);

    const result = await analyzeSentiment('Ahrefs is the best SEO tool');
    expect(result).toBe('positive');
  });

  it("returns 'neutral' for neutral context", async () => {
    mockGenerateText.mockResolvedValueOnce({ text: 'neutral' } as any);

    const result = await analyzeSentiment('Ahrefs is an SEO tool');
    expect(result).toBe('neutral');
  });

  it("returns 'negative' for negative context", async () => {
    mockGenerateText.mockResolvedValueOnce({ text: 'negative' } as any);

    const result = await analyzeSentiment('Ahrefs has poor performance');
    expect(result).toBe('negative');
  });

  it("falls back to 'neutral' for unexpected response", async () => {
    mockGenerateText.mockResolvedValueOnce({ text: 'mixed' } as any);

    const result = await analyzeSentiment('Ahrefs is okay sometimes');
    expect(result).toBe('neutral');
  });
});
