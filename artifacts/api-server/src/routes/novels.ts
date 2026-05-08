import { Router } from "express";
import { eq, desc, sql, ilike, and, or } from "drizzle-orm";
import { db, usersTable, novelsTable, chaptersTable, likesTable, libraryTable, followsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { getAuth } from "@clerk/express";

const router = Router();

async function ensureUser(clerkId: string, req: any) {
  let user = await db.query.usersTable.findFirst({ where: eq(usersTable.clerkId, clerkId) });
  if (!user) {
    const clerkUser = (req as any).auth?.sessionClaims ?? {};
    const [created] = await db.insert(usersTable).values({
      clerkId,
      displayName: clerkUser.name || clerkUser.email?.split("@")[0] || "مستخدم",
      email: clerkUser.email || "",
      photoURL: clerkUser.image_url || null,
    }).returning();
    user = created;
  }
  return user!;
}

// GET /api/novels
router.get("/", async (req, res) => {
  const auth = getAuth(req);
  const currentClerkId = auth?.userId;
  const { sort, genre, search, limit = "20", offset = "0" } = req.query as any;

  try {
    let query = db.select().from(novelsTable).where(eq(novelsTable.status, "published")).$dynamic();
    if (genre) query = query.where(and(eq(novelsTable.status, "published"), eq(novelsTable.genre, genre)));
    if (search) {
      query = query.where(and(eq(novelsTable.status, "published"), ilike(novelsTable.title, `%${search}%`)));
    }
    if (sort === "trending") {
      query = query.orderBy(desc(novelsTable.viewsCount));
    } else if (sort === "top_rated") {
      query = query.orderBy(desc(novelsTable.likesCount));
    } else {
      query = query.orderBy(desc(novelsTable.createdAt));
    }
    query = query.limit(Number(limit)).offset(Number(offset));

    const novels = await query;
    const total = await db.select({ count: sql<number>`count(*)` }).from(novelsTable).where(eq(novelsTable.status, "published"));

    const chaptersData = await db.select({
      novelId: chaptersTable.novelId,
      count: sql<number>`count(*)`,
    }).from(chaptersTable).groupBy(chaptersTable.novelId);
    const chaptersMap = new Map(chaptersData.map(c => [c.novelId, Number(c.count)]));

    let likedIds = new Set<number>();
    if (currentClerkId) {
      const user = await db.query.usersTable.findFirst({ where: eq(usersTable.clerkId, currentClerkId) });
      if (user) {
        const likes = await db.select({ novelId: likesTable.novelId }).from(likesTable).where(eq(likesTable.userId, user.id));
        likedIds = new Set(likes.map(l => l.novelId));
      }
    }

    res.json({
      novels: novels.map(n => ({
        ...n,
        chaptersCount: chaptersMap.get(n.id) ?? 0,
        isLiked: likedIds.has(n.id),
      })),
      total: Number(total[0]?.count ?? 0),
    });
  } catch (err) {
    req.log.error({ err }, "Error listing novels");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/novels/stats
router.get("/stats", async (req, res) => {
  try {
    const [totalNovelsRes] = await db.select({ count: sql<number>`count(*)` }).from(novelsTable).where(eq(novelsTable.status, "published"));
    const [totalAuthorsRes] = await db.select({ count: sql<number>`count(distinct author_clerk_id)` }).from(novelsTable);
    const [totalReadsRes] = await db.select({ total: sql<number>`coalesce(sum(views_count),0)` }).from(novelsTable);
    const [totalChaptersRes] = await db.select({ count: sql<number>`count(*)` }).from(chaptersTable);
    res.json({
      totalNovels: Number(totalNovelsRes?.count ?? 0),
      totalAuthors: Number(totalAuthorsRes?.count ?? 0),
      totalReads: Number(totalReadsRes?.total ?? 0),
      totalChapters: Number(totalChaptersRes?.count ?? 0),
    });
  } catch (err) {
    req.log.error({ err }, "Error getting stats");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/novels/my
router.get("/my", requireAuth, async (req, res) => {
  const clerkId = (req as any).clerkUserId as string;
  try {
    const novels = await db.select().from(novelsTable).where(eq(novelsTable.authorClerkId, clerkId)).orderBy(desc(novelsTable.updatedAt));
    const chaptersData = await db.select({
      novelId: chaptersTable.novelId,
      count: sql<number>`count(*)`,
    }).from(chaptersTable).groupBy(chaptersTable.novelId);
    const chaptersMap = new Map(chaptersData.map(c => [c.novelId, Number(c.count)]));
    res.json(novels.map(n => ({ ...n, chaptersCount: chaptersMap.get(n.id) ?? 0, isLiked: false })));
  } catch (err) {
    req.log.error({ err }, "Error listing my novels");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/novels
router.post("/", requireAuth, async (req, res) => {
  const clerkId = (req as any).clerkUserId as string;
  const { title, summary, genre, coverImage } = req.body;
  try {
    const user = await ensureUser(clerkId, req);
    const [novel] = await db.insert(novelsTable).values({
      title,
      summary,
      genre,
      coverImage,
      status: "draft",
      authorId: user.id,
      authorClerkId: clerkId,
      authorName: user.displayName,
    }).returning();
    res.status(201).json({ ...novel, chaptersCount: 0, isLiked: false });
  } catch (err) {
    req.log.error({ err }, "Error creating novel");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/novels/:novelId
router.get("/:novelId", async (req, res) => {
  const auth = getAuth(req);
  const currentClerkId = auth?.userId;
  const novelId = Number(req.params.novelId);
  try {
    const novel = await db.query.novelsTable.findFirst({ where: eq(novelsTable.id, novelId) });
    if (!novel) { res.status(404).json({ error: "Novel not found" }); return; }
    await db.update(novelsTable).set({ viewsCount: sql`${novelsTable.viewsCount} + 1` }).where(eq(novelsTable.id, novelId));
    const chapters = await db.select().from(chaptersTable).where(eq(chaptersTable.novelId, novelId)).orderBy(chaptersTable.order);
    const author = await db.query.usersTable.findFirst({ where: eq(usersTable.clerkId, novel.authorClerkId) });
    let isLiked = false, inLibrary = false, readingProgress: number | null = null;
    if (currentClerkId) {
      const user = await db.query.usersTable.findFirst({ where: eq(usersTable.clerkId, currentClerkId) });
      if (user) {
        const like = await db.query.likesTable.findFirst({ where: and(eq(likesTable.novelId, novelId), eq(likesTable.userId, user.id)) });
        isLiked = !!like;
        const lib = await db.query.libraryTable.findFirst({ where: and(eq(libraryTable.novelId, novelId), eq(libraryTable.userId, user.id)) });
        inLibrary = !!lib;
        readingProgress = lib?.progress ?? null;
      }
    }
    res.json({ ...novel, chapters: chapters.map(c => ({ ...c })), isLiked, inLibrary, readingProgress, authorPhoto: author?.photoURL ?? null });
  } catch (err) {
    req.log.error({ err }, "Error getting novel");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/novels/:novelId
router.put("/:novelId", requireAuth, async (req, res) => {
  const clerkId = (req as any).clerkUserId as string;
  const novelId = Number(req.params.novelId);
  const { title, summary, genre, coverImage, status } = req.body;
  try {
    const novel = await db.query.novelsTable.findFirst({ where: eq(novelsTable.id, novelId) });
    if (!novel || novel.authorClerkId !== clerkId) { res.status(403).json({ error: "Forbidden" }); return; }
    const [updated] = await db.update(novelsTable).set({ title, summary, genre, coverImage, status, updatedAt: new Date() }).where(eq(novelsTable.id, novelId)).returning();
    res.json({ ...updated, chaptersCount: 0, isLiked: false });
  } catch (err) {
    req.log.error({ err }, "Error updating novel");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/novels/:novelId
router.delete("/:novelId", requireAuth, async (req, res) => {
  const clerkId = (req as any).clerkUserId as string;
  const novelId = Number(req.params.novelId);
  try {
    const novel = await db.query.novelsTable.findFirst({ where: eq(novelsTable.id, novelId) });
    if (!novel || novel.authorClerkId !== clerkId) { res.status(403).json({ error: "Forbidden" }); return; }
    await db.delete(novelsTable).where(eq(novelsTable.id, novelId));
    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "Error deleting novel");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/novels/:novelId/publish
router.post("/:novelId/publish", requireAuth, async (req, res) => {
  const clerkId = (req as any).clerkUserId as string;
  const novelId = Number(req.params.novelId);
  try {
    const novel = await db.query.novelsTable.findFirst({ where: eq(novelsTable.id, novelId) });
    if (!novel || novel.authorClerkId !== clerkId) { res.status(403).json({ error: "Forbidden" }); return; }
    const [updated] = await db.update(novelsTable).set({ status: "published", updatedAt: new Date() }).where(eq(novelsTable.id, novelId)).returning();
    res.json({ ...updated, chaptersCount: 0, isLiked: false });
  } catch (err) {
    req.log.error({ err }, "Error publishing novel");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
