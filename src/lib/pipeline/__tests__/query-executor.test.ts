import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the 'ai' module before importing query-executor
vi.mock('ai', () => ({
  generateText: vi.fn(),
}));

import { generateText } from 'ai';
import { executeQuery } from '../query-executor';

const mockGenerateText = vi.mocked(generateText);

describe('executeQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls generateText with openai model for chatgpt and returns QueryResult', async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: 'mocked response',
      usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
    } as any);

    const result = await executeQuery('chatgpt', 'test prompt');

    expect(mockGenerateText).toHaveBeenCalledOnce();
    expect(result.text).toBe('mocked response');
    expect(result.promptTokens).toBe(100);
    expect(result.completionTokens).toBe(50);
    expect(result.totalTokens).toBe(150);
    expect(result.citations).toEqual([]);
    expect(result.costUsd).toBeGreaterThan(0);
    expect(typeof result.latencyMs).toBe('number');
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('returns citations from perplexity sources', async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: 'perplexity response',
      usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      sources: [{ url: 'https://example.com', title: 'Example' }],
    } as any);

    const result = await executeQuery('perplexity', 'test prompt');

    expect(result.citations).toEqual(['https://example.com']);
    expect(result.text).toBe('perplexity response');
  });

  it('calls generateText with google model for gemini', async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: 'gemini response',
      usage: { promptTokens: 200, completionTokens: 100, totalTokens: 300 },
    } as any);

    const result = await executeQuery('gemini', 'test prompt');

    expect(result.text).toBe('gemini response');
    expect(result.citations).toEqual([]);
    expect(result.promptTokens).toBe(200);
    expect(result.completionTokens).toBe(100);
  });

  it('returns latencyMs >= 0', async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: 'response',
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
    } as any);

    const result = await executeQuery('chatgpt', 'prompt');
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
  });
});
