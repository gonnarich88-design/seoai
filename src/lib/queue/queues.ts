import { Queue } from 'bullmq';
import { connection } from './connection';

export const seoaiQueue = new Queue('seoai-jobs', { connection });

export async function addTestJob(data: Record<string, unknown>) {
  return seoaiQueue.add('test-job', data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  });
}
