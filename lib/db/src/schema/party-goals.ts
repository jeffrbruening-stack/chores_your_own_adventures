import { pgTable, serial, integer, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const goalStatusEnum = pgEnum("goal_status", ["available", "proposed", "active", "completed", "cancelled"]);

export const partyGoalsTable = pgTable("party_goals", {
  id: serial("id").primaryKey(),
  partyId: integer("party_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  targetGold: integer("target_gold").notNull(),
  currentGold: integer("current_gold").notNull().default(0),
  status: goalStatusEnum("status").notNull().default("available"),
  proposedBy: integer("proposed_by"),
  activatedBy: integer("activated_by"),
  redeemedAt: timestamp("redeemed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPartyGoalSchema = createInsertSchema(partyGoalsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPartyGoal = z.infer<typeof insertPartyGoalSchema>;
export type PartyGoal = typeof partyGoalsTable.$inferSelect;
