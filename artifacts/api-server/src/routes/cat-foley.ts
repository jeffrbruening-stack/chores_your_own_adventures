import { Router } from "express";
import { db } from "@workspace/db";
import { catFoleyAppearancesTable, shopItemsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import { assertMember } from "../lib/party.js";

const router = Router();

// GET /api/cat-foley?partyId=
router.get("/", requireAuth, async (req, res) => {
  try {
    const partyId = parseInt(req.query.partyId as string);
    if (!partyId) { res.status(400).json({ error: "partyId required" }); return; }
    await assertMember(partyId, req.userId!);

    const now = new Date();
    const [appearance] = await db.select().from(catFoleyAppearancesTable)
      .where(eq(catFoleyAppearancesTable.partyId, partyId))
      .limit(1);

    const isActive = appearance
      ? appearance.startsAt <= now && appearance.endsAt >= now
      : false;

    if (!isActive) {
      res.json({ active: false, message: null, exclusiveItems: [] });
      return;
    }

    const exclusiveItems = await db.select().from(shopItemsTable)
      .where(and(eq(shopItemsTable.isCatFoleyExclusive, true), eq(shopItemsTable.isActive, true)));

    res.json({
      active: true,
      message: appearance?.message ?? "Cat Foley the merchant has arrived!",
      endsAt: appearance?.endsAt,
      exclusiveItems,
    });
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message ?? "Failed" });
  }
});

export default router;
