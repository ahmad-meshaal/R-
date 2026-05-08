import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, aiQuotaTable, usersTable } from "@workspace/db";
import { DAILY_AI_LIMIT } from "@workspace/db";
import { ai } from "@workspace/integrations-gemini-ai";
import { generateImage } from "@workspace/integrations-gemini-ai/image";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

function getTodayStr() {
  return new Date().toISOString().split("T")[0];
}

async function checkAndIncrementQuota(clerkId: string): Promise<{ allowed: boolean; remaining: number; resetsAt: Date }> {
  const today = getTodayStr();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  let quota = await db.query.aiQuotaTable.findFirst({ where: eq(aiQuotaTable.clerkId, clerkId) });
  if (!quota) {
    const [created] = await db.insert(aiQuotaTable).values({ clerkId, lastRequestDate: today, requestCountToday: 1 }).returning();
    return { allowed: true, remaining: DAILY_AI_LIMIT - 1, resetsAt: tomorrow };
  }
  if (quota.lastRequestDate !== today) {
    await db.update(aiQuotaTable).set({ lastRequestDate: today, requestCountToday: 1, updatedAt: new Date() }).where(eq(aiQuotaTable.clerkId, clerkId));
    return { allowed: true, remaining: DAILY_AI_LIMIT - 1, resetsAt: tomorrow };
  }
  if (quota.requestCountToday >= DAILY_AI_LIMIT) {
    return { allowed: false, remaining: 0, resetsAt: tomorrow };
  }
  await db.update(aiQuotaTable).set({ requestCountToday: quota.requestCountToday + 1, updatedAt: new Date() }).where(eq(aiQuotaTable.clerkId, clerkId));
  return { allowed: true, remaining: DAILY_AI_LIMIT - (quota.requestCountToday + 1), resetsAt: tomorrow };
}

// GET /api/ai/quota
router.get("/quota", requireAuth, async (req, res) => {
  const clerkId = (req as any).clerkUserId as string;
  const today = getTodayStr();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  try {
    const quota = await db.query.aiQuotaTable.findFirst({ where: eq(aiQuotaTable.clerkId, clerkId) });
    const used = (!quota || quota.lastRequestDate !== today) ? 0 : quota.requestCountToday;
    res.json({ used, limit: DAILY_AI_LIMIT, remaining: DAILY_AI_LIMIT - used, resetsAt: tomorrow.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Error getting quota");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/ai/generate-outline
router.post("/generate-outline", requireAuth, async (req, res) => {
  const clerkId = (req as any).clerkUserId as string;
  const { idea, genre, language = "ar" } = req.body;
  try {
    const quota = await checkAndIncrementQuota(clerkId);
    if (!quota.allowed) {
      res.status(429).json({ error: `انتهى حدك اليومي، يرجى العودة غداً. resetsAt: ${quota.resetsAt.toISOString()}` });
      return;
    }
    const lang = language === "ar" ? "العربية" : "English";
    const prompt = `أنت كاتب روائي محترف. قم بإنشاء هيكل رواية مفصل باللغة ${lang} بناءً على هذه الفكرة:
"${idea}"
${genre ? `التصنيف: ${genre}` : ""}

أجب بصيغة JSON فقط بهذا الشكل:
{
  "title": "عنوان الرواية",
  "summary": "ملخص الرواية في فقرة",
  "chapters": [
    { "order": 1, "title": "عنوان الفصل", "summary": "ملخص قصير للفصل" }
  ]
}
اجعل الرواية تحتوي على 8-12 فصلاً.`;
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { responseMimeType: "application/json", maxOutputTokens: 8192 },
    });
    const text = response.text ?? "{}";
    const data = JSON.parse(text);
    res.json({ ...data, remainingQuota: quota.remaining });
  } catch (err) {
    req.log.error({ err }, "Error generating outline");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/ai/generate-plot
router.post("/generate-plot", requireAuth, async (req, res) => {
  const clerkId = (req as any).clerkUserId as string;
  const { idea, genre, language = "ar" } = req.body;
  try {
    const quota = await checkAndIncrementQuota(clerkId);
    if (!quota.allowed) { res.status(429).json({ error: "انتهى حدك اليومي" }); return; }
    const lang = language === "ar" ? "العربية" : "English";
    const prompt = `أنت كاتب روائي متخصص. اكتب حبكة روائية مفصلة باللغة ${lang} بناءً على هذه الفكرة:
"${idea}"
${genre ? `التصنيف: ${genre}` : ""}
اجعل الحبكة تشمل: الشخصيات الرئيسية، الصراع، نقطة التحول، والحل. اكتب بأسلوب أدبي جميل.`;
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { maxOutputTokens: 8192 },
    });
    res.json({ text: response.text ?? "", remainingQuota: quota.remaining });
  } catch (err) {
    req.log.error({ err }, "Error generating plot");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/ai/generate-chapter
router.post("/generate-chapter", requireAuth, async (req, res) => {
  const clerkId = (req as any).clerkUserId as string;
  const { novelTitle, chapterTitle, chapterSummary, previousChapterSummary, genre, language = "ar" } = req.body;
  try {
    const quota = await checkAndIncrementQuota(clerkId);
    if (!quota.allowed) { res.status(429).json({ error: "انتهى حدك اليومي" }); return; }
    const lang = language === "ar" ? "العربية" : "English";
    const prompt = `أنت كاتب روائي محترف. اكتب فصلاً كاملاً باللغة ${lang}:
رواية: "${novelTitle}"
${genre ? `تصنيف: ${genre}` : ""}
عنوان الفصل: "${chapterTitle}"
${chapterSummary ? `ملخص الفصل: ${chapterSummary}` : ""}
${previousChapterSummary ? `ملخص الفصل السابق: ${previousChapterSummary}` : ""}
اكتب الفصل بأسلوب أدبي راقٍ، بطول 1000-2000 كلمة، مع حوارات وأحداث مشوقة.`;
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { maxOutputTokens: 8192 },
    });
    res.json({ text: response.text ?? "", remainingQuota: quota.remaining });
  } catch (err) {
    req.log.error({ err }, "Error generating chapter");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/ai/improve-text
router.post("/improve-text", requireAuth, async (req, res) => {
  const clerkId = (req as any).clerkUserId as string;
  const { text, mode, language = "ar" } = req.body;
  try {
    const quota = await checkAndIncrementQuota(clerkId);
    if (!quota.allowed) { res.status(429).json({ error: "انتهى حدك اليومي" }); return; }
    const modePrompts: Record<string, string> = {
      improve: "حسّن هذا النص وارفع مستواه الأدبي مع الحفاظ على المعنى",
      rewrite: "أعد كتابة هذا النص بأسلوب مختلف وأكثر إبداعاً",
      proofread: "صحح الأخطاء الإملائية والنحوية في هذا النص",
      shorten: "اختصر هذا النص مع الحفاظ على أهم المعاني",
      expand: "وسّع هذا النص وأضف تفاصيل أكثر وأسلوباً أغنى",
    };
    const instruction = modePrompts[mode] || modePrompts.improve;
    const prompt = `${instruction}:\n\n"${text}"\n\nأرجع النص المحسّن فقط بدون أي تعليق إضافي.`;
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { maxOutputTokens: 8192 },
    });
    res.json({ text: response.text ?? "", remainingQuota: quota.remaining });
  } catch (err) {
    req.log.error({ err }, "Error improving text");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/ai/generate-description
router.post("/generate-description", requireAuth, async (req, res) => {
  const clerkId = (req as any).clerkUserId as string;
  const { title, genre, outline, language = "ar" } = req.body;
  try {
    const quota = await checkAndIncrementQuota(clerkId);
    if (!quota.allowed) { res.status(429).json({ error: "انتهى حدك اليومي" }); return; }
    const lang = language === "ar" ? "العربية" : "English";
    const prompt = `اكتب وصفاً جذاباً باللغة ${lang} لرواية بعنوان "${title}"${genre ? ` من تصنيف ${genre}` : ""}${outline ? `\nملخص: ${outline}` : ""}. الوصف يجب أن يكون جاذباً للقراء ويثير فضولهم في 2-3 فقرات.`;
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { maxOutputTokens: 8192 },
    });
    res.json({ text: response.text ?? "", remainingQuota: quota.remaining });
  } catch (err) {
    req.log.error({ err }, "Error generating description");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/ai/generate-cover-prompt
router.post("/generate-cover-prompt", requireAuth, async (req, res) => {
  const clerkId = (req as any).clerkUserId as string;
  const { title, genre, summary, language = "ar" } = req.body;
  try {
    const quota = await checkAndIncrementQuota(clerkId);
    if (!quota.allowed) { res.status(429).json({ error: "انتهى حدك اليومي" }); return; }
    const promptForPrompt = `Generate a detailed English image generation prompt for a book cover for a novel titled "${title}"${genre ? ` in the ${genre} genre` : ""}${summary ? `\nSummary: ${summary}` : ""}. The prompt should describe a visually stunning, professional book cover with specific details about composition, lighting, mood, and style. Output ONLY the image generation prompt.`;
    const promptResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: promptForPrompt }] }],
      config: { maxOutputTokens: 500 },
    });
    const imagePrompt = promptResponse.text ?? `Beautiful book cover for "${title}"`;
    const { b64_json, mimeType } = await generateImage(imagePrompt);
    res.json({ prompt: imagePrompt, b64_json, mimeType, remainingQuota: quota.remaining });
  } catch (err) {
    req.log.error({ err }, "Error generating cover");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
