import { describe, it, expect, afterAll } from 'vitest';
import { Queue, Worker } from 'bullmq';
import type { ConnectionOptions } from 'bullmq';

const TEST_QUEUE = 'test-seoai-jobs';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const connection: ConnectionOptions = {
  host: new URL(redisUrl).hostname,
  port: Number(new URL(redisUrl).port) || 6379,
  maxRetriesPerRequest: null,
};

describe('BullMQ Queue', () => {
  const queue = new Queue(TEST_QUEUE, { connection });
  let worker: Worker;

  afterAll(async () => {
    await worker?.close();
    await queue.obliterate({ force: true });
    await queue.close();
  });

  it('should enqueue a test job and process it', async () => {
    const processedData = new Promise<Record<string, unknown>>((resolve) => {
      worker = new Worker(
        TEST_QUEUE,
        async (job) => {
          resolve(job.data);
          return { success: true };
        },
        { connection }
      );
    });

    await queue.add('test-job', { message: 'hello from test' });
    const data = await processedData;
    expect(data).toEqual({ message: 'hello from test' });
  });
});
