import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, libraryTable, novelsTable, usersTable, chaptersTable, likesTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { sql } from "drizzle-orm";

const router = Router();

// GET /api/library
router.get("/", requireAuth, async (req, res) => {
  const clerkId = (req as any).clerkUserId as string;
  try {
    const user = await db.query.usersTable.findFirst({ where: eq(usersTable.clerkId, clerkId) });
    if (!user) { res.json([]); return; }
    const items = await db.select().from(libraryTable).where(eq(libraryTable.userId, user.id)).orderBy(libraryTable.addedAt);
    const novels = await db.select().from(novelsTable).where(eq(novelsTable.status, "published"));
    const novelsMap = new Map(novels.map(n => [n.id, n]));
    const chaptersData = await db.select({ novelId: chaptersTable.novelId, count: sql<number>`count(*)` }).from(chaptersTable).groupBy(chaptersTable.novelId);
    const chaptersMap = new Map(chaptersData.map(c => [c.novelId, Number(c.count)]));
    const likes = await db.select({ novelId: likesTable.novelId }).from(likesTable).where(eq(likesTable.userId, user.id));
    const likedIds = new Set(likes.map(l => l.novelId));
    res.json(items.map(item => ({
      ...item,
      novel: {
        ...novelsMap.get(item.novelId),
        chaptersCount: chaptersMap.get(item.novelId) ?? 0,
        isLiked: likedIds.has(item.novelId),
      },
    })).filter(i => i.novel?.id));
  } catch (err) {
    req.log.error({ err }, "Error getting library");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/library/:novelId
router.post("/:novelId", requireAuth, async (req, res) => {
  const clerkId = (req as any).clerkUserId as string;
  const novelId = Number(req.params.novelId);
  try {
    const user = await db.query.usersTable.findFirst({ where: eq(usersTable.clerkId, clerkId) });
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    const novel = await db.query.novelsTable.findFirst({ where: eq(novelsTable.id, novelId) });
    if (!novel) { res.status(404).json({ error: "Novel not found" }); return; }
    const [item] = await db.insert(libraryTable).values({ userId: user.id, novelId }).onConflictDoNothing().returning();
    const chaptersData = await db.select({ count: sql<number>`count(*)` }).from(chaptersTable).where(eq(chaptersTable.novelId, novelId));
    res.status(201).json({ ...item, novel: { ...novel, chaptersCount: Number(chaptersData[0]?.count ?? 0), isLiked: false } });
  } catch (err) {
    req.log.error({ err }, "Error adding to library");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/library/:novelId
router.delete("/:novelId", requireAuth, async (req, res) => {
  const clerkId = (req as any).clerkUserId as string;
  const novelId = Number(req.params.novelId);
  try {
    const user = await db.query.usersTable.findFirst({ where: eq(usersTable.clerkId, clerkId) });
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    await db.delete(libraryTable).where(and(eq(libraryTable.userId, user.id), eq(libraryTable.novelId, novelId)));
    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "Error removing from library");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/library/:novelId/progress
router.put("/:novelId/progress", requireAuth, async (req, res) => {
  const clerkId = (req as any).clerkUserId as string;
  const novelId = Number(req.params.novelId);
  const { lastReadChapterId, progress } = req.body;
  try {
    const user = await db.query.usersTable.findFirst({ where: eq(usersTable.clerkId, clerkId) });
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    const [updated] = await db.update(libraryTable).set({ lastReadChapterId, progress }).where(and(eq(libraryTable.userId, user.id), eq(libraryTable.novelId, novelId))).returning();
    if (!updated) { res.status(404).json({ error: "Not in library" }); return; }
    const novel = await db.query.novelsTable.findFirst({ where: eq(novelsTable.id, novelId) });
    res.json({ ...updated, novel: { ...novel, chaptersCount: 0, isLiked: false } });
  } catch (err) {
    req.log.error({ err }, "Error updating progress");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
