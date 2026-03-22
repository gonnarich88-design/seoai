import { Queue } from 'bullmq';
import { connection } from './connection';
import type { ProviderId } from '@/lib/ai/providers';

export const seoaiQueue = new Queue('seoai-jobs', { connection });

export async function addTestJob(data: Record<string, unknown>) {
  return seoaiQueue.add('test-job', data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  });
}

// Rate limiting delays per provider (ms between jobs)
const PROVIDER_DELAYS: Record<ProviderId, number> = {
  chatgpt: 500,     // ~2 req/sec for OpenAI
  perplexity: 1000, // ~1 req/sec for Perplexity
  gemini: 200,      // ~5 req/sec for Gemini
};

export interface QueryJobData {
  keywordId: string;
  providerId: ProviderId;
  batchId: string;
  runNumber: number;
  prompt: string;
  promptVersion: number;
  runType: 'manual' | 'scheduled';
}

// Enqueue 3 query jobs for one keyword+provider combination
export async function addQueryJobs(params: {
  keywordId: string;
  providerId: ProviderId;
  prompt: string;
  promptVersion: number;
  runType: 'manual' | 'scheduled';
}): Promise<string> {
  const batchId = crypto.randomUUID();
  const isManual = params.runType === 'manual';

  for (let runNumber = 1; runNumber <= 3; runNumber++) {
    await seoaiQueue.add('query-job', {
      keywordId: params.keywordId,
      providerId: params.providerId,
      batchId,
      runNumber,
      prompt: params.prompt,
      promptVersion: params.promptVersion,
      runType: params.runType,
    } satisfies QueryJobData, {
      priority: isManual ? 1 : 10,
      delay: PROVIDER_DELAYS[params.providerId] * (runNumber - 1),
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    });
  }
  return batchId;
}

// Enqueue brand analysis job for a single query run
export async function addAnalysisJob(queryRunId: string) {
  await seoaiQueue.add('analysis-job', { queryRunId }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  });
}

// Enqueue sentiment analysis for a brand mention
export async function addSentimentJob(brandMentionId: string) {
  await seoaiQueue.add('sentiment-job', { brandMentionId }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  });
}

// Enqueue snapshot aggregation after batch completes
export async function addSnapshotJob(batchId: string) {
  await seoaiQueue.add('snapshot-job', { batchId }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  });
}

// Enqueue alert detection after snapshot aggregation
export async function addAlertDetectionJob(data: {
  keywordId: string;
  brandId: string;
  providerId: string;
  date: string;
}) {
  await seoaiQueue.add('alert-detection-job', data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  });
}

// Enqueue alert email notification
export async function addAlertNotifyJob(data: { alertId: string }) {
  await seoaiQueue.add('alert-notify-job', data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  });
}
