import { generateText } from 'ai';
import { openai, google, perplexity, MODELS, type ProviderId } from '@/lib/ai/providers';
import { calculateCost } from './cost-calculator';

const providerMap = {
  chatgpt: () => openai(MODELS.chatgpt),
  gemini: () => google(MODELS.gemini),
  perplexity: () => perplexity(MODELS.perplexity),
} as const;

export interface QueryResult {
  text: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
  latencyMs: number;
  citations: string[];
}

export async function executeQuery(
  providerId: ProviderId,
  prompt: string,
): Promise<QueryResult> {
  const model = providerMap[providerId]();
  const start = Date.now();

  const result = await generateText({ model, prompt });

  const latencyMs = Date.now() - start;
  const { promptTokens, completionTokens, totalTokens } = result.usage;
  const costUsd = calculateCost(providerId, promptTokens, completionTokens);
  // AI SDK v4: Perplexity returns result.sources as array of {url, title} objects
  const citations = (result as any).sources?.map((s: { url: string }) => s.url) ?? [];

  return { text: result.text, promptTokens, completionTokens, totalTokens, costUsd, latencyMs, citations };
}
