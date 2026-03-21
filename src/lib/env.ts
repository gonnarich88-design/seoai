import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  AUTH_PASSWORD: z.string().min(8),
  OPENAI_API_KEY: z.string().optional(),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
  PERPLEXITY_API_KEY: z.string().optional(),
});

export const env = envSchema.parse(process.env);
