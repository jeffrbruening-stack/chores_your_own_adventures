import { Router } from "express";
import { db } from "@workspace/db";
import { projectsTable, projectQuestsTable, questDefinitionsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import { assertLeader, assertMember } from "../lib/party.js";

const router = Router();

// GET /api/projects?partyId=
router.get("/", requireAuth, async (req, res) => {
  try {
    const partyId = parseInt(req.query.partyId as string);
    if (!partyId) { res.status(400).json({ error: "partyId required" }); return; }
    await assertMember(partyId, req.userId!);
    const projects = await db.select().from(projectsTable)
      .where(and(eq(projectsTable.partyId, partyId), eq(projectsTable.isActive, true)));
    res.json(projects);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message ?? "Failed" });
  }
});

// POST /api/projects
router.post("/", requireAuth, async (req, res) => {
  try {
    const { partyId, name, description, isBoss, bossHp, targetDate } = req.body;
    if (!partyId || !name) { res.status(400).json({ error: "partyId and name required" }); return; }
    await assertLeader(partyId, req.userId!);
    const [project] = await db.insert(projectsTable).values({
      partyId, creatorId: req.userId!,
      name, description,
      isBoss: isBoss ?? false,
      bossHp: bossHp ?? null,
      currentHp: bossHp ?? null,
      targetDate: targetDate ? new Date(targetDate) : null,
    }).returning();
    res.status(201).json(project);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message ?? "Failed" });
  }
});

// GET /api/projects/:projectId
router.get("/:projectId", requireAuth, async (req, res) => {
  try {
    const projectId = parseInt(String(req.params.projectId));
    const [project] = await db.select().from(projectsTable)
      .where(eq(projectsTable.id, projectId)).limit(1);
    if (!project) { res.status(404).json({ error: "Not found" }); return; }
    await assertMember(project.partyId, req.userId!);
    const quests = await db.select({
      id: questDefinitionsTable.id,
      plainTitle: questDefinitionsTable.plainTitle,
      difficulty: questDefinitionsTable.difficulty,
      isArchived: questDefinitionsTable.isArchived,
    }).from(projectQuestsTable)
      .innerJoin(questDefinitionsTable, eq(questDefinitionsTable.id, projectQuestsTable.questDefinitionId))
      .where(eq(projectQuestsTable.projectId, projectId));
    res.json({ ...project, quests });
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message ?? "Failed" });
  }
});

// PATCH /api/projects/:projectId
router.patch("/:projectId", requireAuth, async (req, res) => {
  try {
    const projectId = parseInt(String(req.params.projectId));
    const [existing] = await db.select({ partyId: projectsTable.partyId })
      .from(projectsTable).where(eq(projectsTable.id, projectId)).limit(1);
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    await assertLeader(existing.partyId, req.userId!);
    const allowed = ["name", "description", "bossHp", "currentHp", "targetDate", "completedAt"];
    const updates: any = { updatedAt: new Date() };
    for (const k of allowed) { if (req.body[k] !== undefined) updates[k] = req.body[k]; }
    const [project] = await db.update(projectsTable).set(updates)
      .where(eq(projectsTable.id, projectId)).returning();
    res.json(project);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message ?? "Failed" });
  }
});

// DELETE /api/projects/:projectId
router.delete("/:projectId", requireAuth, async (req, res) => {
  try {
    const projectId = parseInt(String(req.params.projectId));
    const [existing] = await db.select({ partyId: projectsTable.partyId })
      .from(projectsTable).where(eq(projectsTable.id, projectId)).limit(1);
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    await assertLeader(existing.partyId, req.userId!);
    await db.update(projectsTable).set({ isActive: false, updatedAt: new Date() })
      .where(eq(projectsTable.id, projectId));
    res.status(204).send();
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message ?? "Failed" });
  }
});

// POST /api/projects/:projectId/duplicate
router.post("/:projectId/duplicate", requireAuth, async (req, res) => {
  try {
    const projectId = parseInt(String(req.params.projectId));
    const [existing] = await db.select().from(projectsTable)
      .where(eq(projectsTable.id, projectId)).limit(1);
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    await assertLeader(existing.partyId, req.userId!);
    const { id, createdAt, updatedAt, completedAt, ...rest } = existing;
    const [dup] = await db.insert(projectsTable).values({
      ...rest, name: `${rest.name} (copy)`, creatorId: req.userId!,
      currentHp: rest.bossHp,
    }).returning();
    res.status(201).json(dup);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message ?? "Failed" });
  }
});

export default router;
