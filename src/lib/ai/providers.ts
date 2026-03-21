import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createPerplexity } from '@ai-sdk/perplexity';

// Provider instances -- actual querying happens in Phase 2
// Phase 1 verifies these can be instantiated
export const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || '',
});

export const perplexity = createPerplexity({
  apiKey: process.env.PERPLEXITY_API_KEY || '',
});

// Model identifiers (not hardcoded in source, easy to update)
export const MODELS = {
  chatgpt: 'gpt-4o-mini',
  gemini: 'gemini-2.0-flash',
  perplexity: 'sonar',
} as const;

export type ProviderId = 'chatgpt' | 'perplexity' | 'gemini';
