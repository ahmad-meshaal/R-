import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, commentsTable, chaptersTable, usersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router({ mergeParams: true });

// GET /api/novels/:novelId/chapters/:chapterId/comments
router.get("/", async (req, res) => {
  const chapterId = Number(req.params.chapterId);
  try {
    const comments = await db.select().from(commentsTable).where(eq(commentsTable.chapterId, chapterId)).orderBy(commentsTable.createdAt);
    res.json(comments);
  } catch (err) {
    req.log.error({ err }, "Error listing comments");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/novels/:novelId/chapters/:chapterId/comments
router.post("/", requireAuth, async (req, res) => {
  const clerkId = (req as any).clerkUserId as string;
  const chapterId = Number(req.params.chapterId);
  const { content } = req.body;
  try {
    const user = await db.query.usersTable.findFirst({ where: eq(usersTable.clerkId, clerkId) });
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    const [comment] = await db.insert(commentsTable).values({
      chapterId,
      userId: user.id,
      userClerkId: clerkId,
      userName: user.displayName,
      userPhoto: user.photoURL ?? null,
      content,
    }).returning();
    res.status(201).json(comment);
  } catch (err) {
    req.log.error({ err }, "Error creating comment");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
