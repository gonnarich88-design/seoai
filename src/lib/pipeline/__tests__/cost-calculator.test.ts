import { describe, it, expect } from 'vitest';
import { calculateCost, PRICE_TABLE } from '../cost-calculator';

describe('calculateCost', () => {
  it('calculates correct cost for chatgpt (gpt-4o-mini)', () => {
    // (1000/1_000_000)*0.15 + (500/1_000_000)*0.60 = 0.00015 + 0.0003 = 0.00045
    const cost = calculateCost('chatgpt', 1000, 500);
    expect(cost).toBeCloseTo(0.00045, 6);
  });

  it('calculates correct cost for gemini (gemini-2.0-flash)', () => {
    // (1000/1_000_000)*0.10 + (500/1_000_000)*0.40 = 0.0001 + 0.0002 = 0.0003
    const cost = calculateCost('gemini', 1000, 500);
    expect(cost).toBeCloseTo(0.0003, 6);
  });

  it('calculates correct cost for perplexity (sonar)', () => {
    // (1000/1_000_000)*1.00 + (500/1_000_000)*1.00 = 0.001 + 0.0005 = 0.0015
    const cost = calculateCost('perplexity', 1000, 500);
    expect(cost).toBeCloseTo(0.0015, 6);
  });

  it('returns 0 for unknown provider', () => {
    const cost = calculateCost('unknown', 1000, 500);
    expect(cost).toBe(0);
  });

  it('returns 0 with 0 tokens', () => {
    const cost = calculateCost('chatgpt', 0, 0);
    expect(cost).toBe(0);
  });

  it('exports PRICE_TABLE with entries for all models', () => {
    expect(PRICE_TABLE).toHaveProperty('gpt-4o-mini');
    expect(PRICE_TABLE).toHaveProperty('gemini-2.0-flash');
    expect(PRICE_TABLE).toHaveProperty('sonar');
  });
});
