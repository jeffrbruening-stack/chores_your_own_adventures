import { Router } from "express";
import { db } from "@workspace/db";
import { schoolCalendarsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth.js";
import { assertLeader, assertMember } from "../lib/party.js";

const router = Router();

// GET /api/school-calendars?partyId=
router.get("/", requireAuth, async (req, res) => {
  try {
    const partyId = parseInt(req.query.partyId as string);
    if (!partyId) { res.status(400).json({ error: "partyId required" }); return; }
    await assertMember(partyId, req.userId!);
    const calendars = await db.select().from(schoolCalendarsTable)
      .where(eq(schoolCalendarsTable.partyId, partyId));
    res.json(calendars);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message ?? "Failed" });
  }
});

// POST /api/school-calendars
router.post("/", requireAuth, async (req, res) => {
  try {
    const { partyId, name, activeDays, noSchoolDates } = req.body;
    await assertLeader(partyId, req.userId!);
    const [cal] = await db.insert(schoolCalendarsTable).values({
      partyId, name,
      activeDays: activeDays ?? ["mon","tue","wed","thu","fri"],
      noSchoolDates: noSchoolDates ?? [],
    }).returning();
    res.status(201).json(cal);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message ?? "Failed" });
  }
});

// PATCH /api/school-calendars/:calendarId
router.patch("/:calendarId", requireAuth, async (req, res) => {
  try {
    const calId = parseInt(req.params.calendarId);
    const [existing] = await db.select({ partyId: schoolCalendarsTable.partyId })
      .from(schoolCalendarsTable).where(eq(schoolCalendarsTable.id, calId)).limit(1);
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    await assertLeader(existing.partyId, req.userId!);
    const updates: any = { updatedAt: new Date() };
    if (req.body.name) updates.name = req.body.name;
    if (req.body.activeDays) updates.activeDays = req.body.activeDays;
    if (req.body.noSchoolDates) updates.noSchoolDates = req.body.noSchoolDates;
    const [cal] = await db.update(schoolCalendarsTable).set(updates)
      .where(eq(schoolCalendarsTable.id, calId)).returning();
    res.json(cal);
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message ?? "Failed" });
  }
});

// DELETE /api/school-calendars/:calendarId
router.delete("/:calendarId", requireAuth, async (req, res) => {
  try {
    const calId = parseInt(req.params.calendarId);
    const [existing] = await db.select({ partyId: schoolCalendarsTable.partyId })
      .from(schoolCalendarsTable).where(eq(schoolCalendarsTable.id, calId)).limit(1);
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    await assertLeader(existing.partyId, req.userId!);
    await db.delete(schoolCalendarsTable).where(eq(schoolCalendarsTable.id, calId));
    res.status(204).send();
  } catch (err: any) {
    res.status(err.status ?? 500).json({ error: err.message ?? "Failed" });
  }
});

export default router;
