import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const projectsTable = pgTable("projects", {
  id: serial("id").primaryKey(),
  partyId: integer("party_id").notNull(),
  creatorId: integer("creator_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  isBoss: boolean("is_boss").notNull().default(false),
  bossHp: integer("boss_hp"),
  currentHp: integer("current_hp"),
  isActive: boolean("is_active").notNull().default(true),
  targetDate: timestamp("target_date"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const projectQuestsTable = pgTable("project_quests", {
  projectId: integer("project_id").notNull(),
  questDefinitionId: integer("quest_definition_id").notNull(),
});

export const insertProjectSchema = createInsertSchema(projectsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projectsTable.$inferSelect;
