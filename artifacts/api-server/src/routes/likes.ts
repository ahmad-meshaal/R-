import { Router } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, likesTable, novelsTable, usersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router({ mergeParams: true });

// POST /api/novels/:novelId/like
router.post("/", requireAuth, async (req, res) => {
  const clerkId = (req as any).clerkUserId as string;
  const novelId = Number(req.params.novelId);
  try {
    const user = await db.query.usersTable.findFirst({ where: eq(usersTable.clerkId, clerkId) });
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    const existing = await db.query.likesTable.findFirst({
      where: and(eq(likesTable.novelId, novelId), eq(likesTable.userId, user.id))
    });
    if (existing) {
      await db.delete(likesTable).where(and(eq(likesTable.novelId, novelId), eq(likesTable.userId, user.id)));
      const [novel] = await db.update(novelsTable).set({ likesCount: sql`${novelsTable.likesCount} - 1` }).where(eq(novelsTable.id, novelId)).returning();
      res.json({ liked: false, likesCount: novel?.likesCount ?? 0 });
    } else {
      await db.insert(likesTable).values({ novelId, userId: user.id });
      const [novel] = await db.update(novelsTable).set({ likesCount: sql`${novelsTable.likesCount} + 1` }).where(eq(novelsTable.id, novelId)).returning();
      res.json({ liked: true, likesCount: novel?.likesCount ?? 0 });
    }
  } catch (err) {
    req.log.error({ err }, "Error toggling like");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
