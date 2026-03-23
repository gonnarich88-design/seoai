CREATE TABLE "alerts" (
	"id" text PRIMARY KEY NOT NULL,
	"keyword_id" text,
	"brand_id" text,
	"alert_type" text NOT NULL,
	"previous_value" jsonb,
	"current_value" jsonb,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"notified_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "brand_mentions" (
	"id" text PRIMARY KEY NOT NULL,
	"query_run_id" text NOT NULL,
	"brand_id" text NOT NULL,
	"mentioned" boolean DEFAULT false NOT NULL,
	"position" integer,
	"context_snippet" text,
	"sentiment" text,
	"is_recommended" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brands" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"aliases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_own" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"keyword_id" text NOT NULL,
	"brand_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"avg_position" numeric(5, 2),
	"mention_rate" numeric(5, 4),
	"avg_sentiment" numeric(5, 2),
	"run_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "keywords" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"prompt" text NOT NULL,
	"prompt_version" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "query_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"keyword_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"model" text NOT NULL,
	"prompt" text NOT NULL,
	"prompt_version" integer NOT NULL,
	"raw_response" text NOT NULL,
	"citations" jsonb DEFAULT '[]'::jsonb,
	"tokens_used" integer,
	"cost_usd" numeric(10, 6),
	"latency_ms" integer,
	"run_number" integer NOT NULL,
	"batch_id" text NOT NULL,
	"run_type" text DEFAULT 'scheduled' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_keyword_id_keywords_id_fk" FOREIGN KEY ("keyword_id") REFERENCES "public"."keywords"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_mentions" ADD CONSTRAINT "brand_mentions_query_run_id_query_runs_id_fk" FOREIGN KEY ("query_run_id") REFERENCES "public"."query_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_mentions" ADD CONSTRAINT "brand_mentions_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_snapshots" ADD CONSTRAINT "daily_snapshots_keyword_id_keywords_id_fk" FOREIGN KEY ("keyword_id") REFERENCES "public"."keywords"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_snapshots" ADD CONSTRAINT "daily_snapshots_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "query_runs" ADD CONSTRAINT "query_runs_keyword_id_keywords_id_fk" FOREIGN KEY ("keyword_id") REFERENCES "public"."keywords"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_brand_mentions_query_run" ON "brand_mentions" USING btree ("query_run_id");--> statement-breakpoint
CREATE INDEX "idx_brand_mentions_brand" ON "brand_mentions" USING btree ("brand_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_daily_snapshots_lookup" ON "daily_snapshots" USING btree ("keyword_id","brand_id","provider_id","date");--> statement-breakpoint
CREATE INDEX "idx_query_runs_keyword_provider" ON "query_runs" USING btree ("keyword_id","provider_id");--> statement-breakpoint
CREATE INDEX "idx_query_runs_batch" ON "query_runs" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "idx_query_runs_created" ON "query_runs" USING btree ("created_at");