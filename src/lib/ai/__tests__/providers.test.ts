import { describe, it, expect } from 'vitest';
import { openai, google, perplexity, MODELS } from '../providers';

describe('AI SDK Providers', () => {
  it('should instantiate OpenAI provider', () => {
    expect(openai).toBeDefined();
    const model = openai(MODELS.chatgpt);
    expect(model).toBeDefined();
    expect(model.modelId).toBe(MODELS.chatgpt);
  });

  it('should instantiate Google Gemini provider', () => {
    expect(google).toBeDefined();
    const model = google(MODELS.gemini);
    expect(model).toBeDefined();
    expect(model.modelId).toBe(MODELS.gemini);
  });

  it('should instantiate Perplexity provider', () => {
    expect(perplexity).toBeDefined();
    const model = perplexity(MODELS.perplexity);
    expect(model).toBeDefined();
    expect(model.modelId).toBe(MODELS.perplexity);
  });

  it('should have correct model identifiers', () => {
    expect(MODELS.chatgpt).toBe('gpt-4o-mini');
    expect(MODELS.gemini).toBe('gemini-2.0-flash');
    expect(MODELS.perplexity).toBe('sonar');
  });
});
