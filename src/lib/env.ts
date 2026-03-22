import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  AUTH_PASSWORD: z.string().min(8),
  OPENAI_API_KEY: z.string().optional(),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
  PERPLEXITY_API_KEY: z.string().optional(),
  DAILY_BUDGET_OPENAI: z.coerce.number().default(1.0),
  DAILY_BUDGET_PERPLEXITY: z.coerce.number().default(1.0),
  DAILY_BUDGET_GEMINI: z.coerce.number().default(1.0),
  CHECK_SCHEDULE_CRON: z.string().default('0 0 * * *'),
});

export const env = envSchema.parse(process.env);
