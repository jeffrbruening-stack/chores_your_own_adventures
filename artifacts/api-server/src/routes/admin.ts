import { Router } from "express";
import { db } from "@workspace/db";
import {
  usersTable, shopItemsTable, gameConfigTable, auditLogsTable,
} from "@workspace/db/schema";
import { eq, like, or, desc } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../lib/auth.js";
import { levelFromXp } from "../lib/rewards.js";

const router = Router();
router.use(requireAuth, requireAdmin);

// GET /api/admin/users?q=
router.get("/users", async (req, res) => {
  try {
    const q = (req.query.q as string) ?? "";
    const users = q
      ? await db.select({
          id: usersTable.id, displayName: usersTable.displayName,
          email: usersTable.email, userType: usersTable.userType,
          isAppAdmin: usersTable.isAppAdmin, currentLevel: usersTable.currentLevel,
          lifetimeXp: usersTable.lifetimeXp, personalGold: usersTable.personalGold,
          createdAt: usersTable.createdAt,
        }).from(usersTable)
          .where(or(like(usersTable.displayName, `%${q}%`), like(usersTable.email, `%${q}%`)))
      : await db.select({
          id: usersTable.id, displayName: usersTable.displayName,
          email: usersTable.email, userType: usersTable.userType,
          isAppAdmin: usersTable.isAppAdmin, currentLevel: usersTable.currentLevel,
          lifetimeXp: usersTable.lifetimeXp, personalGold: usersTable.personalGold,
          createdAt: usersTable.createdAt,
        }).from(usersTable);
    res.json(users);
  } catch {
    res.status(500).json({ error: "Failed" });
  }
});

// GET /api/admin/users/:userId
router.get("/users/:userId", async (req, res) => {
  try {
    const userId = parseInt(String(req.params.userId));
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) { res.status(404).json({ error: "Not found" }); return; }
    res.json(user);
  } catch {
    res.status(500).json({ error: "Failed" });
  }
});

// POST /api/admin/users/:userId/adjust
router.post("/users/:userId/adjust", async (req, res) => {
  try {
    const userId = parseInt(String(req.params.userId));
    const { xpDelta, goldDelta, reason, makeAdmin, removeAdmin } = req.body;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) { res.status(404).json({ error: "Not found" }); return; }
    const updates: any = { updatedAt: new Date() };
    if (xpDelta) {
      updates.lifetimeXp = Math.max(0, user.lifetimeXp + xpDelta);
      updates.currentLevel = levelFromXp(updates.lifetimeXp);
    }
    if (goldDelta) updates.personalGold = Math.max(0, user.personalGold + goldDelta);
    if (typeof makeAdmin === "boolean") updates.isAppAdmin = makeAdmin;
    if (typeof removeAdmin === "boolean" && removeAdmin) updates.isAppAdmin = false;
    const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, userId)).returning();
    // Audit log
    await db.insert(auditLogsTable).values({
      action: "admin.adjust_user",
      actorId: req.userId!,
      targetUserId: userId,
      details: { xpDelta, goldDelta, makeAdmin },
      reason: reason ?? null,
    });
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Failed" });
  }
});

// GET /api/admin/shop
router.get("/shop", async (_req, res) => {
  try {
    const items = await db.select().from(shopItemsTable);
    res.json(items);
  } catch {
    res.status(500).json({ error: "Failed" });
  }
});

// POST /api/admin/shop
router.post("/shop", async (req, res) => {
  try {
    const { name, category, description, goldPrice, minLevel, emoji, isCatFoleyExclusive, isEvolvingPet } = req.body;
    const [item] = await db.insert(shopItemsTable).values({
      name, category, description,
      goldPrice: goldPrice ?? 100,
      minLevel: minLevel ?? 1,
      emoji: emoji ?? "⚔️",
      isCatFoleyExclusive: isCatFoleyExclusive ?? false,
      isEvolvingPet: isEvolvingPet ?? false,
    }).returning();
    res.status(201).json(item);
  } catch {
    res.status(500).json({ error: "Failed" });
  }
});

// PATCH /api/admin/shop/:itemId
router.patch("/shop/:itemId", async (req, res) => {
  try {
    const itemId = parseInt(String(req.params.itemId));
    const allowed = ["name","description","goldPrice","minLevel","emoji","isActive","isCatFoleyExclusive"];
    const updates: any = { updatedAt: new Date() };
    for (const k of allowed) { if (req.body[k] !== undefined) updates[k] = req.body[k]; }
    const [item] = await db.update(shopItemsTable).set(updates).where(eq(shopItemsTable.id, itemId)).returning();
    res.json(item);
  } catch {
    res.status(500).json({ error: "Failed" });
  }
});

// GET /api/admin/config
router.get("/config", async (_req, res) => {
  try {
    const [config] = await db.select().from(gameConfigTable).limit(1);
    if (!config) {
      // Create default config
      const [c] = await db.insert(gameConfigTable).values({
        rewardTable: {},
        levelCurve: [0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700],
        catFoleyConfig: {},
      }).returning();
      res.json(c); return;
    }
    res.json(config);
  } catch {
    res.status(500).json({ error: "Failed" });
  }
});

// PATCH /api/admin/config
router.patch("/config", async (req, res) => {
  try {
    const { rewardTable, levelCurve, catFoleyConfig } = req.body;
    const [existing] = await db.select({ id: gameConfigTable.id }).from(gameConfigTable).limit(1);
    const updates: any = { updatedAt: new Date(), updatedBy: req.userId! };
    if (rewardTable) updates.rewardTable = rewardTable;
    if (levelCurve) updates.levelCurve = levelCurve;
    if (catFoleyConfig) updates.catFoleyConfig = catFoleyConfig;
    let config;
    if (existing) {
      [config] = await db.update(gameConfigTable).set(updates).where(eq(gameConfigTable.id, existing.id)).returning();
    } else {
      [config] = await db.insert(gameConfigTable).values(updates).returning();
    }
    res.json(config);
  } catch {
    res.status(500).json({ error: "Failed" });
  }
});

// GET /api/admin/audit-logs
router.get("/audit-logs", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const logs = await db.select().from(auditLogsTable)
      .orderBy(desc(auditLogsTable.createdAt)).limit(limit);
    res.json(logs);
  } catch {
    res.status(500).json({ error: "Failed" });
  }
});

export default router;
