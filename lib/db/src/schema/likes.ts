import { pgTable, serial, integer, timestamp, unique } from "drizzle-orm/pg-core";
import { novelsTable } from "./novels";
import { usersTable } from "./users";

export const likesTable = pgTable("likes", {
  id: serial("id").primaryKey(),
  novelId: integer("novel_id").notNull().references(() => novelsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [unique("likes_novel_user").on(t.novelId, t.userId)]);

export type Like = typeof likesTable.$inferSelect;
