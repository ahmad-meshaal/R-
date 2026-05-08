import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, conversations as conversationsTable, messages as messagesTable } from "@workspace/db";
import { ai } from "@workspace/integrations-gemini-ai";
import { generateImage } from "@workspace/integrations-gemini-ai/image";
import { requireAuth } from "../middlewares/requireAuth";

const router = Router();

// GET /api/gemini/conversations
router.get("/conversations", requireAuth, async (req, res) => {
  try {
    const conversations = await db.select().from(conversationsTable).orderBy(conversationsTable.createdAt);
    res.json(conversations);
  } catch (err) {
    req.log.error({ err }, "Error listing conversations");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/gemini/conversations
router.post("/conversations", requireAuth, async (req, res) => {
  const { title } = req.body;
  try {
    const [conversation] = await db.insert(conversationsTable).values({ title }).returning();
    res.status(201).json(conversation);
  } catch (err) {
    req.log.error({ err }, "Error creating conversation");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/gemini/conversations/:id
router.get("/conversations/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  try {
    const conversation = await db.query.conversationsTable.findFirst({ where: eq(conversationsTable.id, id) });
    if (!conversation) { res.status(404).json({ error: "Not found" }); return; }
    const messages = await db.select().from(messagesTable).where(eq(messagesTable.conversationId, id)).orderBy(messagesTable.createdAt);
    res.json({ ...conversation, messages });
  } catch (err) {
    req.log.error({ err }, "Error getting conversation");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/gemini/conversations/:id
router.delete("/conversations/:id", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  try {
    await db.delete(conversationsTable).where(eq(conversationsTable.id, id));
    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "Error deleting conversation");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/gemini/conversations/:id/messages
router.get("/conversations/:id/messages", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  try {
    const messages = await db.select().from(messagesTable).where(eq(messagesTable.conversationId, id)).orderBy(messagesTable.createdAt);
    res.json(messages);
  } catch (err) {
    req.log.error({ err }, "Error listing messages");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/gemini/conversations/:id/messages
router.post("/conversations/:id/messages", requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  const { content } = req.body;
  try {
    const conversation = await db.query.conversationsTable.findFirst({ where: eq(conversationsTable.id, id) });
    if (!conversation) { res.status(404).json({ error: "Not found" }); return; }
    await db.insert(messagesTable).values({ conversationId: id, role: "user", content });
    const chatMessages = await db.select().from(messagesTable).where(eq(messagesTable.conversationId, id)).orderBy(messagesTable.createdAt);
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    let fullResponse = "";
    const stream = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: chatMessages.map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      config: { maxOutputTokens: 8192 },
    });
    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) {
        fullResponse += text;
        res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
      }
    }
    await db.insert(messagesTable).values({ conversationId: id, role: "assistant", content: fullResponse });
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "Error sending message");
    res.write(`data: ${JSON.stringify({ error: "Internal server error" })}\n\n`);
    res.end();
  }
});

// POST /api/gemini/generate-image
router.post("/generate-image", requireAuth, async (req, res) => {
  const { prompt } = req.body;
  try {
    const { b64_json, mimeType } = await generateImage(prompt);
    res.json({ b64_json, mimeType });
  } catch (err) {
    req.log.error({ err }, "Error generating image");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
