import { pgTable, serial, text, boolean, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userTypeEnum = pgEnum("user_type", ["adult", "kid"]);

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").unique(), // null for kids
  displayName: text("display_name").notNull(),
  passwordHash: text("password_hash"), // null for kids
  userType: userTypeEnum("user_type").notNull().default("adult"),
  isAppAdmin: boolean("is_app_admin").notNull().default(false),
  lifetimeXp: integer("lifetime_xp").notNull().default(0),
  currentLevel: integer("current_level").notNull().default(1),
  personalGold: integer("personal_gold").notNull().default(0),
  legendaryCompletions: integer("legendary_completions").notNull().default(0),
  adventureMode: boolean("adventure_mode").notNull().default(true),
  soundEnabled: boolean("sound_enabled").notNull().default(true),
  hapticsEnabled: boolean("haptics_enabled").notNull().default(true),
  activePartyId: integer("active_party_id"),
  pinHash: text("pin_hash"), // for kids
  pinAttempts: integer("pin_attempts").notNull().default(0),
  pinLockedUntil: timestamp("pin_locked_until"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
