import { pgTable, serial, integer, text, boolean, timestamp, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const shopItemCategoryEnum = pgEnum("shop_item_category", [
  "weapon", "offhand", "outfit", "head", "legs", "back", "pet",
  "pet_accessory", "background", "effect"
]);

export const shopItemsTable = pgTable("shop_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: shopItemCategoryEnum("category").notNull(),
  description: text("description"),
  goldPrice: integer("gold_price").notNull().default(100),
  minLevel: integer("min_level").notNull().default(1),
  isActive: boolean("is_active").notNull().default(true),
  isCatFoleyExclusive: boolean("is_cat_foley_exclusive").notNull().default(false),
  isStarter: boolean("is_starter").notNull().default(false),
  isEvolvingPet: boolean("is_evolving_pet").notNull().default(false),
  evolutionStages: jsonb("evolution_stages"),
  emoji: text("emoji").notNull().default("⚔️"),
  /** Path relative to public/paperdoll/gandalf/, e.g. "hats/male/male-green-cap.png".
   *  Null means this item has no paperdoll art yet and stays emoji-only —
   *  equip rendering skips it and falls back to whatever was there before. */
  spriteKey: text("sprite_key"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const userInventoryTable = pgTable("user_inventory", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  shopItemId: integer("shop_item_id").notNull(),
  purchasedAt: timestamp("purchased_at").notNull().defaultNow(),
  undoWindowEnd: timestamp("undo_window_end"),
});

export const equippedItemsTable = pgTable("equipped_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  slot: text("slot").notNull(),
  shopItemId: integer("shop_item_id").notNull(),
  equippedAt: timestamp("equipped_at").notNull().defaultNow(),
});

export const insertShopItemSchema = createInsertSchema(shopItemsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertShopItem = z.infer<typeof insertShopItemSchema>;
export type ShopItem = typeof shopItemsTable.$inferSelect;
export type UserInventoryItem = typeof userInventoryTable.$inferSelect;
