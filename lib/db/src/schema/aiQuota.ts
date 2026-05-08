import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";

export const aiQuotaTable = pgTable("ai_quota", {
  id: serial("id").primaryKey(),
  clerkId: text("clerk_id").notNull().unique(),
  lastRequestDate: text("last_request_date").notNull().default(""),
  requestCountToday: integer("request_count_today").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const DAILY_AI_LIMIT = 20;

export type AiQuota = typeof aiQuotaTable.$inferSelect;
