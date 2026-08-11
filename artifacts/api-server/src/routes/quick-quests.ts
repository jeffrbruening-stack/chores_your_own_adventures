/**
 * /api/quick-quests — matches the OpenAPI spec path consumed by the generated client.
 */
import { Router } from "express";
import { db } from "@workspace/db";
import { quickQuestsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";

const router = Router();

// GET /api/quick-quests  (spec: listQuickQuests)
router.get("/", requireAuth, async (req, res) => {
  try {
    const quests = await db.select().from(quickQuestsTable)
      .where(eq(quickQuestsTable.isActive, true));
    res.json(quests);
  } catch {
    res.status(500).json({ error: "Failed" });
  }
});

export default router;
