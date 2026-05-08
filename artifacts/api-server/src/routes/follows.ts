import { Router } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, followsTable, usersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

// POST /api/follows/:userId
router.post("/:userId", requireAuth, async (req, res) => {
  const followerClerkId = (req as any).clerkUserId as string;
  const followingClerkId = req.params.userId;
  try {
    const follower = await db.query.usersTable.findFirst({ where: eq(usersTable.clerkId, followerClerkId) });
    const following = await db.query.usersTable.findFirst({ where: eq(usersTable.clerkId, followingClerkId) });
    if (!follower || !following) { res.status(404).json({ error: "User not found" }); return; }
    await db.insert(followsTable).values({
      followerId: follower.id, followingId: following.id,
      followerClerkId, followingClerkId,
    }).onConflictDoNothing();
    await db.update(usersTable).set({ followersCount: sql`${usersTable.followersCount} + 1` }).where(eq(usersTable.clerkId, followingClerkId));
    await db.update(usersTable).set({ followingCount: sql`${usersTable.followingCount} + 1` }).where(eq(usersTable.clerkId, followerClerkId));
    const [updatedFollowing] = await db.select({ followersCount: usersTable.followersCount }).from(usersTable).where(eq(usersTable.clerkId, followingClerkId));
    res.json({ following: true, followersCount: updatedFollowing?.followersCount ?? 0 });
  } catch (err) {
    req.log.error({ err }, "Error following user");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/follows/:userId
router.delete("/:userId", requireAuth, async (req, res) => {
  const followerClerkId = (req as any).clerkUserId as string;
  const followingClerkId = req.params.userId;
  try {
    const follower = await db.query.usersTable.findFirst({ where: eq(usersTable.clerkId, followerClerkId) });
    const following = await db.query.usersTable.findFirst({ where: eq(usersTable.clerkId, followingClerkId) });
    if (!follower || !following) { res.status(404).json({ error: "User not found" }); return; }
    await db.delete(followsTable).where(and(eq(followsTable.followerClerkId, followerClerkId), eq(followsTable.followingClerkId, followingClerkId)));
    await db.update(usersTable).set({ followersCount: sql`GREATEST(${usersTable.followersCount} - 1, 0)` }).where(eq(usersTable.clerkId, followingClerkId));
    await db.update(usersTable).set({ followingCount: sql`GREATEST(${usersTable.followingCount} - 1, 0)` }).where(eq(usersTable.clerkId, followerClerkId));
    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "Error unfollowing user");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
