import { MODELS, type ProviderId } from '@/lib/ai/providers';

// Prices per 1M tokens (USD)
const PRICE_TABLE: Record<string, { inputPerMillion: number; outputPerMillion: number }> = {
  'gpt-4o-mini':       { inputPerMillion: 0.150,  outputPerMillion: 0.600 },
  'gemini-2.0-flash':  { inputPerMillion: 0.100,  outputPerMillion: 0.400 },
  'sonar':             { inputPerMillion: 1.000,  outputPerMillion: 1.000 },
};

export { PRICE_TABLE };

export function calculateCost(
  providerId: ProviderId | string,
  promptTokens: number,
  completionTokens: number,
): number {
  const model = MODELS[providerId as keyof typeof MODELS];
  if (!model) return 0;
  const prices = PRICE_TABLE[model];
  if (!prices) return 0;
  const inputCost = (promptTokens / 1_000_000) * prices.inputPerMillion;
  const outputCost = (completionTokens / 1_000_000) * prices.outputPerMillion;
  return parseFloat((inputCost + outputCost).toFixed(6));
}
