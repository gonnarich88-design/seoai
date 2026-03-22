import 'dotenv/config';
import { Worker } from 'bullmq';
import type { ConnectionOptions } from 'bullmq';
import { handleQueryJob } from './handlers/query-handler';
import { handleAnalysisJob } from './handlers/analysis-handler';
import { handleSentimentJob } from './handlers/sentiment-handler';
import { handleSnapshotJob } from './handlers/snapshot-handler';
import { handleAlertDetectionJob } from './handlers/alert-handler';
import { handleAlertNotifyJob } from './handlers/alert-notify-handler';
import { handleWeeklyReportJob } from './handlers/weekly-report-handler';
import { setupDailyScheduler } from './handlers/scheduler-setup';
import { checkBudget } from '@/lib/pipeline/budget-checker';
import { addQueryJobs } from '@/lib/queue/queues';
import { db } from '@/lib/db/client';
import { keywords } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import type { ProviderId } from '@/lib/ai/providers';

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
      case 'query-job': {
        const { providerId } = job.data;
        const withinBudget = await checkBudget(providerId);
        if (!withinBudget) {
          console.log(`Budget exceeded for ${providerId}, skipping query job ${job.id}`);
          return { skipped: true, reason: 'budget_exceeded' };
        }
        return handleQueryJob(job);
      }
      case 'analysis-job':
        return handleAnalysisJob(job);
      case 'sentiment-job':
        return handleSentimentJob(job);
      case 'snapshot-job':
        return handleSnapshotJob(job);
      case 'alert-detection-job':
        return handleAlertDetectionJob(job);
      case 'alert-notify-job':
        return handleAlertNotifyJob(job);
      case 'weekly-report':
        return handleWeeklyReportJob(job);
      case 'scheduled-check': {
        // Daily scheduled check: load all active keywords, enqueue for all providers
        const activeKeywords = await db.select().from(keywords).where(eq(keywords.isActive, true));
        const providers: ProviderId[] = ['chatgpt', 'perplexity', 'gemini'];

        for (const kw of activeKeywords) {
          for (const pid of providers) {
            const budgetOk = await checkBudget(pid);
            if (!budgetOk) {
              console.log(`Budget exceeded for ${pid}, skipping ${kw.label}`);
              continue;
            }
            await addQueryJobs({
              keywordId: kw.id,
              providerId: pid,
              prompt: kw.prompt,
              promptVersion: kw.promptVersion,
              runType: 'scheduled',
            });
          }
        }
        console.log(`Scheduled check completed for ${activeKeywords.length} keywords`);
        return { scheduled: activeKeywords.length };
      }
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

// Initialize daily scheduler on worker startup
setupDailyScheduler().catch(err => console.error('Failed to setup daily scheduler:', err));

console.log('Worker started, waiting for jobs...');
