import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, chaptersTable, novelsTable, commentsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router({ mergeParams: true });

// GET /api/novels/:novelId/chapters
router.get("/", async (req, res) => {
  const novelId = Number(req.params.novelId);
  try {
    const chapters = await db.select().from(chaptersTable).where(eq(chaptersTable.novelId, novelId)).orderBy(chaptersTable.order);
    res.json(chapters);
  } catch (err) {
    req.log.error({ err }, "Error listing chapters");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/novels/:novelId/chapters
router.post("/", requireAuth, async (req, res) => {
  const clerkId = (req as any).clerkUserId as string;
  const novelId = Number(req.params.novelId);
  const { title, content, order } = req.body;
  try {
    const novel = await db.query.novelsTable.findFirst({ where: eq(novelsTable.id, novelId) });
    if (!novel || novel.authorClerkId !== clerkId) { res.status(403).json({ error: "Forbidden" }); return; }
    const wordCount = (content || "").trim().split(/\s+/).filter(Boolean).length;
    const [chapter] = await db.insert(chaptersTable).values({
      novelId,
      title,
      content: content || "",
      order: order ?? 1,
      wordCount,
    }).returning();
    await db.update(novelsTable).set({ updatedAt: new Date() }).where(eq(novelsTable.id, novelId));
    res.status(201).json(chapter);
  } catch (err) {
    req.log.error({ err }, "Error creating chapter");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/novels/:novelId/chapters/:chapterId
router.get("/:chapterId", async (req, res) => {
  const novelId = Number(req.params.novelId);
  const chapterId = Number(req.params.chapterId);
  try {
    const chapter = await db.query.chaptersTable.findFirst({ where: and(eq(chaptersTable.id, chapterId), eq(chaptersTable.novelId, novelId)) });
    if (!chapter) { res.status(404).json({ error: "Chapter not found" }); return; }
    const comments = await db.select().from(commentsTable).where(eq(commentsTable.chapterId, chapterId)).orderBy(commentsTable.createdAt);
    res.json({ ...chapter, comments });
  } catch (err) {
    req.log.error({ err }, "Error getting chapter");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/novels/:novelId/chapters/:chapterId
router.put("/:chapterId", requireAuth, async (req, res) => {
  const clerkId = (req as any).clerkUserId as string;
  const novelId = Number(req.params.novelId);
  const chapterId = Number(req.params.chapterId);
  const { title, content, order } = req.body;
  try {
    const novel = await db.query.novelsTable.findFirst({ where: eq(novelsTable.id, novelId) });
    if (!novel || novel.authorClerkId !== clerkId) { res.status(403).json({ error: "Forbidden" }); return; }
    const wordCount = content ? content.trim().split(/\s+/).filter(Boolean).length : undefined;
    const [updated] = await db.update(chaptersTable).set({
      title, content, order, wordCount,
      updatedAt: new Date(),
    }).where(and(eq(chaptersTable.id, chapterId), eq(chaptersTable.novelId, novelId))).returning();
    if (!updated) { res.status(404).json({ error: "Chapter not found" }); return; }
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Error updating chapter");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/novels/:novelId/chapters/:chapterId
router.delete("/:chapterId", requireAuth, async (req, res) => {
  const clerkId = (req as any).clerkUserId as string;
  const novelId = Number(req.params.novelId);
  const chapterId = Number(req.params.chapterId);
  try {
    const novel = await db.query.novelsTable.findFirst({ where: eq(novelsTable.id, novelId) });
    if (!novel || novel.authorClerkId !== clerkId) { res.status(403).json({ error: "Forbidden" }); return; }
    await db.delete(chaptersTable).where(and(eq(chaptersTable.id, chapterId), eq(chaptersTable.novelId, novelId)));
    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "Error deleting chapter");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
