import { generateText } from 'ai';
import { openai } from '@/lib/ai/providers';

export type Sentiment = 'positive' | 'neutral' | 'negative';

export async function analyzeSentiment(
  contextSnippet: string,
): Promise<Sentiment> {
  const result = await generateText({
    model: openai('gpt-4o-mini'),
    prompt: `Classify the sentiment of this brand mention as exactly one of: positive, neutral, negative.\n\nContext: "${contextSnippet}"\n\nRespond with only one word: positive, neutral, or negative.`,
  });

  const sentiment = result.text.trim().toLowerCase();
  if (
    sentiment === 'positive' ||
    sentiment === 'neutral' ||
    sentiment === 'negative'
  ) {
    return sentiment;
  }
  return 'neutral'; // fallback for unexpected responses
}
