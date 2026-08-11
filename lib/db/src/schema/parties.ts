import { pgTable, serial, text, boolean, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const memberRoleEnum = pgEnum("member_role", ["leader", "adult", "kid"]);

export const partiesTable = pgTable("parties", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  householdCode: text("household_code").notNull().unique(),
  founderId: integer("founder_id").notNull(),
  partyGoldReserve: integer("party_gold_reserve").notNull().default(0),
  routinesPaused: boolean("routines_paused").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const partyMembersTable = pgTable("party_members", {
  id: serial("id").primaryKey(),
  partyId: integer("party_id").notNull(),
  userId: integer("user_id").notNull(),
  role: memberRoleEnum("role").notNull().default("kid"),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
});

export const inviteTokensTable = pgTable("invite_tokens", {
  id: serial("id").primaryKey(),
  partyId: integer("party_id").notNull(),
  token: text("token").notNull().unique(),
  createdBy: integer("created_by").notNull(),
  usedBy: integer("used_by"),
  usedAt: timestamp("used_at"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPartySchema = createInsertSchema(partiesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertParty = z.infer<typeof insertPartySchema>;
export type Party = typeof partiesTable.$inferSelect;
export type PartyMember = typeof partyMembersTable.$inferSelect;
