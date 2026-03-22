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

  const allExceeded = results.every(r => r.status === 'budget_exceeded');
  if (allExceeded) {
    return NextResponse.json({ error: 'Budget exceeded for all providers', results }, { status: 402 });
  }

  return NextResponse.json({
    message: 'Check triggered',
    keywordId,
    results,
  }, { status: 200 });
}
