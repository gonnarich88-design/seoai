import { db } from '@/lib/db/client';
import { queryRuns } from '@/lib/db/schema';
import { sql, eq, and, gte, lt } from 'drizzle-orm';
import type { ProviderId } from '@/lib/ai/providers';

const BUDGET_ENV_MAP: Record<ProviderId, string> = {
  chatgpt: 'DAILY_BUDGET_OPENAI',
  perplexity: 'DAILY_BUDGET_PERPLEXITY',
  gemini: 'DAILY_BUDGET_GEMINI',
};

export function getBudgetCap(providerId: ProviderId): number {
  const envKey = BUDGET_ENV_MAP[providerId];
  return parseFloat(process.env[envKey] || '1.0');
}

export async function checkBudget(providerId: ProviderId): Promise<boolean> {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

  const [result] = await db
    .select({ total: sql<string>`COALESCE(SUM(${queryRuns.costUsd}), 0)` })
    .from(queryRuns)
    .where(and(
      eq(queryRuns.providerId, providerId),
      gte(queryRuns.createdAt, today),
      lt(queryRuns.createdAt, tomorrow),
    ));

  const spent = parseFloat(result?.total || '0');
  const cap = getBudgetCap(providerId);
  return spent < cap;
}
