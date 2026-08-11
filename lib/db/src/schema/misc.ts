import { pgTable, serial, integer, text, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";

export const passwordResetTokensTable = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const catFoleyAppearancesTable = pgTable("cat_foley_appearances", {
  id: serial("id").primaryKey(),
  partyId: integer("party_id"), // null = global
  startsAt: timestamp("starts_at").notNull(),
  endsAt: timestamp("ends_at").notNull(),
  message: text("message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const schoolCalendarsTable = pgTable("school_calendars", {
  id: serial("id").primaryKey(),
  partyId: integer("party_id").notNull(),
  name: text("name").notNull(),
  activeDays: text("active_days").array().notNull().default(["mon","tue","wed","thu","fri"]),
  noSchoolDates: text("no_school_dates").array().notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const auditLogsTable = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  action: text("action").notNull(),
  actorId: integer("actor_id").notNull(),
  actorDisplayName: text("actor_display_name"),
  targetUserId: integer("target_user_id"),
  targetPartyId: integer("target_party_id"),
  details: jsonb("details"),
  reason: text("reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const gameConfigTable = pgTable("game_config", {
  id: serial("id").primaryKey(),
  rewardTable: jsonb("reward_table").notNull().default({}),
  levelCurve: integer("level_curve").array().notNull().default([0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700]),
  catFoleyConfig: jsonb("cat_foley_config").notNull().default({}),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  updatedBy: integer("updated_by"),
});

export const quickQuestsTable = pgTable("quick_quests", {
  id: serial("id").primaryKey(),
  plainTitle: text("plain_title").notNull(),
  adventureTitle: text("adventure_title"),
  difficulty: text("difficulty").notNull().default("normal"),
  xpReward: integer("xp_reward").notNull().default(25),
  goldReward: integer("gold_reward").notNull().default(10),
  partyGoldReward: integer("party_gold_reward").notNull().default(5),
  isActive: boolean("is_active").notNull().default(true),
});
