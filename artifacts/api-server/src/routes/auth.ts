import { Router } from "express";
import { eq, sql } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

// Upsert helper — creates user if missing
async function upsertUser(clerkId: string, data?: {
  displayName?: string; email?: string; photoURL?: string;
}) {
  let user = await db.query.usersTable.findFirst({
    where: eq(usersTable.clerkId, clerkId),
  });
  if (!user) {
    const [created] = await db.insert(usersTable).values({
      clerkId,
      displayName: data?.displayName ?? clerkId.slice(0, 12),
      email: data?.email ?? "",
      photoURL: data?.photoURL ?? null,
    }).returning();
    user = created;
  }
  return user;
}

// GET /api/auth/me
router.get("/me", requireAuth, async (req, res) => {
  const clerkId = (req as any).clerkUserId as string;
  try {
    const user = await upsertUser(clerkId);
    const result = await db.execute(
      sql`SELECT COUNT(*) as count FROM novels WHERE author_clerk_id = ${clerkId}`
    );
    const novelsCount = Number((result.rows[0] as any)?.count ?? 0);
    res.json({ ...user, novelsCount });
  } catch (err) {
    req.log.error({ err }, "Error getting me");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/sync  — called by frontend on first sign-in with Clerk profile data
router.post("/sync", requireAuth, async (req, res) => {
  const clerkId = (req as any).clerkUserId as string;
  const { displayName, email, photoURL } = req.body;
  try {
    let user = await db.query.usersTable.findFirst({
      where: eq(usersTable.clerkId, clerkId),
    });
    if (!user) {
      const [created] = await db.insert(usersTable).values({
        clerkId,
        displayName: displayName ?? clerkId.slice(0, 12),
        email: email ?? "",
        photoURL: photoURL ?? null,
      }).returning();
      user = created;
    } else {
      // Update name/photo if provided and not yet set
      const updates: Partial<typeof usersTable.$inferInsert> = {};
      if (displayName && (!user.displayName || user.displayName === user.clerkId.slice(0, 12))) {
        updates.displayName = displayName;
      }
      if (photoURL && !user.photoURL) updates.photoURL = photoURL;
      if (email && !user.email) updates.email = email;
      if (Object.keys(updates).length > 0) {
        const [updated] = await db.update(usersTable).set(updates)
          .where(eq(usersTable.clerkId, clerkId)).returning();
        user = updated;
      }
    }
    res.json({ ok: true, user });
  } catch (err) {
    req.log.error({ err }, "Error syncing user");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/auth/me
router.put("/me", requireAuth, async (req, res) => {
  const clerkId = (req as any).clerkUserId as string;
  const { displayName, bio, photoURL } = req.body;
  try {
    // Upsert first so user always exists
    await upsertUser(clerkId);
    const updates: Record<string, any> = {};
    if (displayName !== undefined) updates.displayName = displayName;
    if (bio !== undefined) updates.bio = bio;
    if (photoURL !== undefined) updates.photoURL = photoURL;

    const [updated] = await db.update(usersTable).set(updates)
      .where(eq(usersTable.clerkId, clerkId)).returning();
    res.json({ ...updated, novelsCount: 0 });
  } catch (err) {
    req.log.error({ err }, "Error updating me");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/auth/users/:userId
router.get("/users/:userId", async (req, res) => {
  const { userId } = req.params;
  const { getAuth } = await import("@clerk/express");
  const auth = getAuth(req);
  const currentClerkId = auth?.userId;
  try {
    let user = await db.query.usersTable.findFirst({
      where: eq(usersTable.clerkId, userId),
    });

    // If user not in DB yet, return minimal profile (don't 404 — they just haven't logged in yet)
    if (!user) {
      res.json({
        id: null,
        clerkId: userId,
        displayName: "مستخدم جديد",
        bio: null,
        photoURL: null,
        followersCount: 0,
        followingCount: 0,
        novelsCount: 0,
        isFollowing: false,
        novels: [],
      });
      return;
    }

    const { db: database } = await import("@workspace/db");
    const { novelsTable } = await import("@workspace/db");
    const { eq: eqOp } = await import("drizzle-orm");
    const novels = await database.select().from(novelsTable)
      .where(eqOp(novelsTable.authorClerkId, userId));
    const publishedNovels = novels.filter(n => n.status === "published");

    let isFollowing = false;
    if (currentClerkId && currentClerkId !== userId) {
      const { followsTable } = await import("@workspace/db");
      const follow = await database.query.followsTable.findFirst({
        where: (f: any, { and: andOp }: any) =>
          andOp(eqOp(f.followerClerkId, currentClerkId), eqOp(f.followingClerkId, userId)),
      });
      isFollowing = !!follow;
    }

    res.json({
      ...user,
      novelsCount: publishedNovels.length,
      isFollowing,
      novels: publishedNovels.map(n => ({
        ...n,
        chaptersCount: 0,
        isLiked: false,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Error getting user profile");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
