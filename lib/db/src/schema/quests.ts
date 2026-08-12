import { pgTable, serial, integer, text, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const questDifficultyEnum = pgEnum("quest_difficulty", ["easy", "normal", "hard", "epic", "legendary"]);
export const questTypeEnum = pgEnum("quest_type", ["individual", "open", "party", "quick"]);
export const questStatusEnum = pgEnum("quest_status", ["pending", "assigned", "active", "submitted", "completed", "failed", "proposed"]);
export const proposalStatusEnum = pgEnum("proposal_status", ["pending", "approved", "rejected"]);

export const questDefinitionsTable = pgTable("quest_definitions", {
  id: serial("id").primaryKey(),
  partyId: integer("party_id").notNull(),
  creatorId: integer("creator_id").notNull(),
  plainTitle: text("plain_title").notNull(),
  adventureTitle: text("adventure_title"),
  description: text("description"),
  questType: questTypeEnum("quest_type").notNull().default("individual"),
  difficulty: questDifficultyEnum("difficulty").notNull().default("normal"),
  isLegendary: boolean("is_legendary").notNull().default(false),
  assignedToUserIds: text("assigned_to_user_ids").array(), // null = open quest
  requiresVerification: boolean("requires_verification").notNull().default(false),
  xpReward: integer("xp_reward").notNull().default(25),
  goldReward: integer("gold_reward").notNull().default(10),
  partyGoldReward: integer("party_gold_reward").notNull().default(5),
  isRoutine: boolean("is_routine").notNull().default(false),
  routineSchedule: text("routine_schedule"), // JSON: { days: number[] } (0=Sun…6=Sat)
  scheduledDate: text("scheduled_date"),     // ISO datetime string for one-time deadline
  timeWindowStart: text("time_window_start"), // "HH:MM"
  timeWindowEnd: text("time_window_end"),     // "HH:MM"
  isPaused: boolean("is_paused").notNull().default(false),
  isArchived: boolean("is_archived").notNull().default(false),
  schoolCalendarId: integer("school_calendar_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const questAssignmentsTable = pgTable("quest_assignments", {
  id: serial("id").primaryKey(),
  questDefinitionId: integer("quest_definition_id").notNull(),
  userId: integer("user_id"),
  partyId: integer("party_id").notNull(),
  status: questStatusEnum("status").notNull().default("active"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  expiresAt: timestamp("expires_at"),
  timeWindowStart: timestamp("time_window_start"),
  timeWindowEnd: timestamp("time_window_end"),
  xpAwarded: integer("xp_awarded").notNull().default(0),
  goldAwarded: integer("gold_awarded").notNull().default(0),
  partyGoldAwarded: integer("party_gold_awarded").notNull().default(0),
  verificationNote: text("verification_note"),
  reviewedBy: integer("reviewed_by"),
  claimedBy: integer("claimed_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const questProposalsTable = pgTable("quest_proposals", {
  id: serial("id").primaryKey(),
  partyId: integer("party_id").notNull(),
  proposedBy: integer("proposed_by").notNull(),
  plainTitle: text("plain_title").notNull(),
  adventureTitle: text("adventure_title"),
  description: text("description"),
  difficulty: questDifficultyEnum("difficulty").notNull().default("normal"),
  status: proposalStatusEnum("status").notNull().default("pending"),
  reviewedBy: integer("reviewed_by"),
  reviewNote: text("review_note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertQuestDefinitionSchema = createInsertSchema(questDefinitionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertQuestDefinition = z.infer<typeof insertQuestDefinitionSchema>;
export type QuestDefinition = typeof questDefinitionsTable.$inferSelect;
export type QuestAssignment = typeof questAssignmentsTable.$inferSelect;
