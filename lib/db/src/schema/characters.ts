import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const charactersTable = pgTable("characters", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  adventurerName: text("adventurer_name").notNull(),
  species: text("species").notNull().default("human"),
  class: text("class").notNull().default("warrior"),
  gender: text("gender").notNull().default("neutral"),
  skinTone: text("skin_tone").notNull().default("medium"),
  hairStyle: text("hair_style").notNull().default("short"),
  hairColor: text("hair_color").notNull().default("brown"),
  eyeColor: text("eye_color").notNull().default("brown"),
  hasGlasses: boolean("has_glasses").notNull().default(false),
  facialHair: text("facial_hair").notNull().default("none"),
  cooldownUntil: timestamp("cooldown_until"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCharacterSchema = createInsertSchema(charactersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCharacter = z.infer<typeof insertCharacterSchema>;
export type Character = typeof charactersTable.$inferSelect;
