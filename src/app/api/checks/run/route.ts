import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db/client';
import { keywords } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { addQueryJobs } from '@/lib/queue/queues';
import { checkBudget } from '@/lib/pipeline/budget-checker';
import type { ProviderId } from '@/lib/ai/providers';

const runCheckSchema = z.object({
  keywordId: z.string().min(1),
});

const PROVIDERS: ProviderId[] = ['chatgpt', 'perplexity', 'gemini'];

const PROVIDER_ENV_KEYS: Record<ProviderId, string> = {
  chatgpt: 'OPENAI_API_KEY',
  gemini: 'GOOGLE_GENERATIVE_AI_API_KEY',
  perplexity: 'PERPLEXITY_API_KEY',
};

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = runCheckSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'keywordId is required' }, { status: 400 });
  }

  const { keywordId } = parsed.data;

  // Verify keyword exists
  const [keyword] = await db.select().from(keywords).where(eq(keywords.id, keywordId));
  if (!keyword) {
    return NextResponse.json({ error: 'Keyword not found' }, { status: 404 });
  }

  const results: Array<{ providerId: string; batchId: string | null; status: string }> = [];

  for (const providerId of PROVIDERS) {
    // Skip providers without API keys configured
    if (!process.env[PROVIDER_ENV_KEYS[providerId]]) {
      results.push({ providerId, batchId: null, status: 'no_api_key' });
      continue;
    }

    const withinBudget = await checkBudget(providerId);
    if (!withinBudget) {
      results.push({ providerId, batchId: null, status: 'budget_exceeded' });
      continue;
    }

    const batchId = await addQueryJobs({
      keywordId,
      providerId,
      prompt: keyword.prompt,
      promptVersion: keyword.promptVersion,
      runType: 'manual',
    });

    results.push({ providerId, batchId, status: 'queued' });
  }

  const allSkipped = results.every(r => r.status === 'budget_exceeded' || r.status === 'no_api_key');
  if (allSkipped) {
    const hasNoKey = results.some(r => r.status === 'no_api_key');
    const hasBudget = results.some(r => r.status === 'budget_exceeded');
    let error = 'Could not queue any provider.';
    if (hasNoKey && !hasBudget) error = 'No AI provider API keys configured. Please set OPENAI_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY, or PERPLEXITY_API_KEY.';
    else if (hasBudget && !hasNoKey) error = 'Budget exceeded for all providers.';
    return NextResponse.json({ error, results }, { status: 402 });
  }

  const queued = results.filter(r => r.status === 'queued').map(r => r.providerId);
  const skipped = results.filter(r => r.status !== 'queued').map(r => r.providerId);

  return NextResponse.json({
    message: skipped.length > 0
      ? `Check queued for ${queued.join(', ')}. Skipped: ${skipped.join(', ')} (no API key or budget exceeded).`
      : 'Check triggered',
    keywordId,
    results,
  }, { status: 200 });
}
