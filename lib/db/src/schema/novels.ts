import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const novelsTable = pgTable("novels", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  summary: text("summary"),
  genre: text("genre"),
  status: text("status").notNull().default("draft"),
  authorId: integer("author_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  authorClerkId: text("author_clerk_id").notNull(),
  authorName: text("author_name").notNull(),
  coverImage: text("cover_image"),
  likesCount: integer("likes_count").notNull().default(0),
  viewsCount: integer("views_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertNovelSchema = createInsertSchema(novelsTable).omit({ id: true, createdAt: true, updatedAt: true, likesCount: true, viewsCount: true });
export type InsertNovel = z.infer<typeof insertNovelSchema>;
export type Novel = typeof novelsTable.$inferSelect;
