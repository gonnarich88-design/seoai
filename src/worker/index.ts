import 'dotenv/config';
import { Worker } from 'bullmq';
import type { ConnectionOptions } from 'bullmq';
import { handleQueryJob } from './handlers/query-handler';
import { handleAnalysisJob } from './handlers/analysis-handler';
import { handleSentimentJob } from './handlers/sentiment-handler';
import { handleSnapshotJob } from './handlers/snapshot-handler';

const connection: ConnectionOptions = {
  host: new URL(process.env.REDIS_URL || 'redis://localhost:6379').hostname,
  port:
    Number(new URL(process.env.REDIS_URL || 'redis://localhost:6379').port) ||
    6379,
  maxRetriesPerRequest: null,
};

const worker = new Worker(
  'seoai-jobs',
  async (job) => {
    switch (job.name) {
      case 'test-job':
        console.log('Test job processed:', job.data);
        return { success: true, processedAt: new Date().toISOString() };
      case 'query-job':
        return handleQueryJob(job);
      case 'analysis-job':
        return handleAnalysisJob(job);
      case 'sentiment-job':
        return handleSentimentJob(job);
      case 'snapshot-job':
        return handleSnapshotJob(job);
      default:
        console.warn(`Unknown job type: ${job.name}`);
    }
  },
  {
    connection,
    concurrency: 5,
  }
);

worker.on('completed', (job) => console.log(`Job ${job.id} completed`));
worker.on('failed', (job, err) =>
  console.error(`Job ${job?.id} failed:`, err)
);

console.log('Worker started, waiting for jobs...');
