import type { ConnectionOptions } from 'bullmq';

// BullMQ connection options -- shared across queue and worker in the Next.js process.
// The worker process (src/worker/index.ts) creates its own connection since it runs separately.
export const connection: ConnectionOptions = {
  host: new URL(process.env.REDIS_URL || 'redis://localhost:6379').hostname,
  port: Number(new URL(process.env.REDIS_URL || 'redis://localhost:6379').port) || 6379,
  maxRetriesPerRequest: null, // Required by BullMQ
};
