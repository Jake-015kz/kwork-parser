CREATE TABLE "analyses" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" serial NOT NULL,
	"verdict" varchar(20) NOT NULL,
	"score" integer,
	"reasoning" jsonb,
	"response_text" text,
	"response_cost" varchar(100),
	"response_timeline" varchar(100),
	"model_used" varchar(100),
	"tokens_used" integer,
	"cost_usd" numeric(10, 8),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blacklist" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_name" varchar(255) NOT NULL,
	"reason" varchar(500) DEFAULT '',
	"auto_blocked" boolean DEFAULT false NOT NULL,
	"block_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "blacklist_user_name_unique" UNIQUE("user_name")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"platform" varchar(20) DEFAULT 'kwork' NOT NULL,
	"platform_id" varchar(100) NOT NULL,
	"kwork_id" integer DEFAULT 0 NOT NULL,
	"category_id" integer NOT NULL,
	"name" varchar(500) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"price_limit" numeric(10, 2),
	"max_days" integer,
	"user_name" varchar(255),
	"user_rating" numeric(3, 1),
	"user_hired_percent" integer,
	"user_wants_count" integer,
	"user_badges" jsonb DEFAULT '[]'::jsonb,
	"url" varchar(500),
	"status" varchar(20) DEFAULT 'new' NOT NULL,
	"views_count" integer,
	"skip_reason" text,
	"date_create" timestamp,
	"date_active" timestamp,
	"date_expire" timestamp,
	"time_left" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "responses" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" serial NOT NULL,
	"content" text NOT NULL,
	"status" varchar(20) DEFAULT 'queued' NOT NULL,
	"kwork_offer_id" varchar(100),
	"sent" boolean DEFAULT false NOT NULL,
	"sent_at" timestamp,
	"viewed_at" timestamp,
	"responded_at" timestamp,
	"rejected_at" timestamp,
	"reject_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(100) NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "sync_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" varchar(50) NOT NULL,
	"status" varchar(20) NOT NULL,
	"message" text,
	"projects_found" integer DEFAULT 0,
	"projects_new" integer DEFAULT 0,
	"projects_analyzed" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "responses" ADD CONSTRAINT "responses_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "platform_id_idx" ON "projects" USING btree ("platform_id");