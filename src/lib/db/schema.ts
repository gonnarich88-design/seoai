import {
  pgTable,
  text,
  boolean,
  timestamp,
  integer,
  decimal,
  jsonb,
  date,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ─── Table 1: keywords ───────────────────────────────────────────────

export const keywords = pgTable('keywords', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  label: text('label').notNull(),
  prompt: text('prompt').notNull(),
  promptVersion: integer('prompt_version').notNull().default(1),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ─── Table 2: brands ─────────────────────────────────────────────────

export const brands = pgTable('brands', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  aliases: jsonb('aliases').$type<string[]>().notNull().default([]),
  isOwn: boolean('is_own').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ─── Table 3: queryRuns ──────────────────────────────────────────────

export const queryRuns = pgTable(
  'query_runs',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    keywordId: text('keyword_id')
      .notNull()
      .references(() => keywords.id),
    providerId: text('provider_id').notNull(),
    model: text('model').notNull(),
    prompt: text('prompt').notNull(),
    promptVersion: integer('prompt_version').notNull(),
    rawResponse: text('raw_response').notNull(),
    citations: jsonb('citations').$type<string[]>().default([]),
    tokensUsed: integer('tokens_used'),
    costUsd: decimal('cost_usd', { precision: 10, scale: 6 }),
    latencyMs: integer('latency_ms'),
    runNumber: integer('run_number').notNull(),
    batchId: text('batch_id').notNull(),
    runType: text('run_type').notNull().default('scheduled'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_query_runs_keyword_provider').on(
      table.keywordId,
      table.providerId,
    ),
    index('idx_query_runs_batch').on(table.batchId),
    index('idx_query_runs_created').on(table.createdAt),
  ],
);

// ─── Table 4: brandMentions ──────────────────────────────────────────

export const brandMentions = pgTable(
  'brand_mentions',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    queryRunId: text('query_run_id')
      .notNull()
      .references(() => queryRuns.id),
    brandId: text('brand_id')
      .notNull()
      .references(() => brands.id),
    mentioned: boolean('mentioned').notNull().default(false),
    position: integer('position'),
    contextSnippet: text('context_snippet'),
    sentiment: text('sentiment'),
    isRecommended: boolean('is_recommended').default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_brand_mentions_query_run').on(table.queryRunId),
    index('idx_brand_mentions_brand').on(table.brandId, table.createdAt),
  ],
);

// ─── Table 5: alerts ─────────────────────────────────────────────────

export const alerts = pgTable('alerts', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  keywordId: text('keyword_id').references(() => keywords.id),
  brandId: text('brand_id').references(() => brands.id),
  alertType: text('alert_type').notNull(),
  previousValue: jsonb('previous_value'),
  currentValue: jsonb('current_value'),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  notifiedAt: timestamp('notified_at'),
});

// ─── Table 6: dailySnapshots ─────────────────────────────────────────

export const dailySnapshots = pgTable(
  'daily_snapshots',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    date: date('date').notNull(),
    keywordId: text('keyword_id')
      .notNull()
      .references(() => keywords.id),
    brandId: text('brand_id')
      .notNull()
      .references(() => brands.id),
    providerId: text('provider_id').notNull(),
    avgPosition: decimal('avg_position', { precision: 5, scale: 2 }),
    mentionRate: decimal('mention_rate', { precision: 5, scale: 4 }),
    avgSentiment: decimal('avg_sentiment', { precision: 5, scale: 2 }),
    runCount: integer('run_count').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_daily_snapshots_lookup').on(
      table.keywordId,
      table.brandId,
      table.providerId,
      table.date,
    ),
  ],
);

// ─── Relations ───────────────────────────────────────────────────────

export const keywordsRelations = relations(keywords, ({ many }) => ({
  queryRuns: many(queryRuns),
  alerts: many(alerts),
  dailySnapshots: many(dailySnapshots),
}));

export const brandsRelations = relations(brands, ({ many }) => ({
  brandMentions: many(brandMentions),
  alerts: many(alerts),
  dailySnapshots: many(dailySnapshots),
}));

export const queryRunsRelations = relations(queryRuns, ({ one, many }) => ({
  keyword: one(keywords, {
    fields: [queryRuns.keywordId],
    references: [keywords.id],
  }),
  brandMentions: many(brandMentions),
}));

export const brandMentionsRelations = relations(brandMentions, ({ one }) => ({
  queryRun: one(queryRuns, {
    fields: [brandMentions.queryRunId],
    references: [queryRuns.id],
  }),
  brand: one(brands, {
    fields: [brandMentions.brandId],
    references: [brands.id],
  }),
}));

export const alertsRelations = relations(alerts, ({ one }) => ({
  keyword: one(keywords, {
    fields: [alerts.keywordId],
    references: [keywords.id],
  }),
  brand: one(brands, {
    fields: [alerts.brandId],
    references: [brands.id],
  }),
}));

export const dailySnapshotsRelations = relations(
  dailySnapshots,
  ({ one }) => ({
    keyword: one(keywords, {
      fields: [dailySnapshots.keywordId],
      references: [keywords.id],
    }),
    brand: one(brands, {
      fields: [dailySnapshots.brandId],
      references: [brands.id],
    }),
  }),
);
