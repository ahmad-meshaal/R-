import { pgTable, serial, integer, timestamp, unique } from "drizzle-orm/pg-core";
import { novelsTable } from "./novels";
import { usersTable } from "./users";

export const libraryTable = pgTable("library", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  novelId: integer("novel_id").notNull().references(() => novelsTable.id, { onDelete: "cascade" }),
  lastReadChapterId: integer("last_read_chapter_id"),
  progress: integer("progress").notNull().default(0),
  addedAt: timestamp("added_at").notNull().defaultNow(),
}, (t) => [unique("library_user_novel").on(t.userId, t.novelId)]);

export type LibraryItem = typeof libraryTable.$inferSelect;
