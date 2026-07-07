import {
  pgTable, serial, varchar, text, integer, decimal, timestamp, boolean, jsonb, uniqueIndex
} from "drizzle-orm/pg-core";

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  kworkId: integer("kwork_id").notNull().unique(),
  categoryId: integer("category_id").notNull(),
  name: varchar("name", { length: 500 }).notNull(),
  description: text("description").notNull().default(""),
  priceLimit: decimal("price_limit", { precision: 10, scale: 2 }),
  maxDays: integer("max_days"),
  userName: varchar("user_name", { length: 255 }),
  userRating: decimal("user_rating", { precision: 3, scale: 1 }),
  userHiredPercent: integer("user_hired_percent"),
  userWantsCount: integer("user_wants_count"),
  userBadges: jsonb("user_badges").default([]),
  url: varchar("url", { length: 500 }),
  status: varchar("status", { length: 20 }).notNull().default("new"),
  viewsCount: integer("views_count"),
  skipReason: text("skip_reason"),
  dateCreate: timestamp("date_create"),
  dateActive: timestamp("date_active"),
  dateExpire: timestamp("date_expire"),
  timeLeft: varchar("time_left", { length: 50 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  kworkIdx: uniqueIndex("kwork_idx").on(table.kworkId),
}));

export const analyses = pgTable("analyses", {
  id: serial("id").primaryKey(),
  projectId: serial("project_id").references(() => projects.id).notNull(),
  verdict: varchar("verdict", { length: 20 }).notNull(),
  score: integer("score"),
  reasoning: jsonb("reasoning"),
  responseText: text("response_text"),
  responseCost: varchar("response_cost", { length: 100 }),
  responseTimeline: varchar("response_timeline", { length: 100 }),
  modelUsed: varchar("model_used", { length: 100 }),
  tokensUsed: integer("tokens_used"),
  costUsd: decimal("cost_usd", { precision: 10, scale: 8 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const responses = pgTable("responses", {
  id: serial("id").primaryKey(),
  projectId: serial("project_id").references(() => projects.id).notNull(),
  content: text("content").notNull(),
  sent: boolean("sent").notNull().default(false),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const syncLogs = pgTable("sync_logs", {
  id: serial("id").primaryKey(),
  type: varchar("type", { length: 50 }).notNull(),
  status: varchar("status", { length: 20 }).notNull(),
  message: text("message"),
  projectsFound: integer("projects_found").default(0),
  projectsNew: integer("projects_new").default(0),
  projectsAnalyzed: integer("projects_analyzed").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const blacklist = pgTable("blacklist", {
  id: serial("id").primaryKey(),
  userName: varchar("user_name", { length: 255 }).notNull().unique(),
  reason: varchar("reason", { length: 500 }).default(""),
  autoBlocked: boolean("auto_blocked").notNull().default(false),
  blockCount: integer("block_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
